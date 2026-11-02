import asyncio
import logging
import uuid

from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.models.customer_session import CustomerSession
from app.models.questionnaire_response import QuestionnaireResponse
from app.repositories.recommendation_repository import (
    combine_skin_concerns,
    get_formulation_candidate_information,
    get_latest_questionnaire_response,
    mark_recommendation_run_failed,
    persist_recommendation,
    start_recommendation_run,
    store_questionnaire_detections,
    workflow_detections_ready,
)
from app.services.formulation_ai.client import (
    FormulationAIError,
    FormulationMalformedResponseError,
    call_formulation_ai,
)
from app.services.questionnaire_ai.client import (
    QuestionnaireAIError,
    QuestionnaireMalformedResponseError,
    call_questionnaire_ai,
)

logger = logging.getLogger("celrevive_backend.recommendation_task")


async def run_questionnaire_analysis(
    questionnaire_response_id: uuid.UUID,
    session_id: uuid.UUID,
) -> None:
    async with AsyncSessionLocal() as db:
        try:
            response_result = await db.execute(
                select(QuestionnaireResponse).where(
                    QuestionnaireResponse.questionnaire_response_id
                    == questionnaire_response_id,
                    QuestionnaireResponse.session_id == session_id,
                )
            )
            questionnaire_response = response_result.scalar_one_or_none()
            if questionnaire_response is None:
                raise ValueError("Questionnaire response not found for the session")

            raw, analysis = await asyncio.to_thread(
                call_questionnaire_ai,
                questionnaire_response.response_json,
            )
            await store_questionnaire_detections(
                db,
                session_id=session_id,
                questionnaire_response_id=questionnaire_response_id,
                detections=analysis,
                raw_response_json=raw,
            )
            await complete_recommendation_if_ready(
                db,
                session_id=session_id,
                questionnaire_response_id=questionnaire_response_id,
            )
        except (QuestionnaireAIError, QuestionnaireMalformedResponseError, ValueError):
            await _mark_workflow_failed(db, session_id)
            logger.exception(
                "Questionnaire analysis failed session_id=%s response_id=%s",
                session_id,
                questionnaire_response_id,
            )
        except Exception:
            await _mark_workflow_failed(db, session_id)
            logger.exception(
                "Questionnaire background task failed session_id=%s response_id=%s",
                session_id,
                questionnaire_response_id,
            )


async def complete_recommendation_if_ready(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    questionnaire_response_id: uuid.UUID | None = None,
) -> None:
    questionnaire_response = (
        await get_latest_questionnaire_response(db, session_id=session_id)
        if questionnaire_response_id is None
        else None
    )
    if questionnaire_response_id is None:
        if questionnaire_response is None:
            return
        questionnaire_response_id = questionnaire_response.questionnaire_response_id

    if not await workflow_detections_ready(
        db,
        session_id=session_id,
        questionnaire_response_id=questionnaire_response_id,
    ):
        return

    try:
        combined = await combine_skin_concerns(
            db,
            session_id=session_id,
            questionnaire_response_id=questionnaire_response_id,
        )
        candidate_information = await get_formulation_candidate_information(
            db,
            session_id=session_id,
            questionnaire_response_id=questionnaire_response_id,
            combined_concerns=combined,
        )
        _validate_candidate_data(candidate_information)
        model_name = get_settings().FORMULATION_AI_MODEL
        recommendation_id = await start_recommendation_run(
            db,
            session_id=session_id,
            candidate_information=candidate_information,
            model_name=model_name,
        )
        if recommendation_id is None:
            return

        try:
            _, recommendation = await asyncio.to_thread(
                call_formulation_ai,
                candidate_information,
            )
            await persist_recommendation(
                db,
                recommendation_id=recommendation_id,
                session_id=session_id,
                candidate_information=candidate_information,
                recommendation=recommendation,
            )
        except Exception as exc:
            await mark_recommendation_run_failed(
                db,
                recommendation_id=recommendation_id,
                session_id=session_id,
                message=str(exc),
            )
            raise
    except Exception:
        if db.in_transaction():
            await db.rollback()
        await db.execute(
            update(CustomerSession)
            .where(CustomerSession.session_id == session_id)
            .values(session_status="ERROR", updated_at=text("CURRENT_TIMESTAMP"))
        )
        await db.commit()
        logger.exception("Recommendation workflow failed session_id=%s", session_id)


def _validate_candidate_data(candidate_information: dict) -> None:
    concerns = candidate_information["combined_skin_concerns"]
    if not candidate_information["candidate_bases"]:
        raise ValueError("No formulation base candidates are available")

    mappings = {
        item["concern_id"] for item in candidate_information["concern_benefit_mappings"]
    }
    active_scores = {
        item["concern_id"] for item in candidate_information["active_concern_scores"]
    }
    for concern in concerns:
        concern_id = concern["skin_concern_id"]
        if concern_id not in mappings:
            raise ValueError(
                f"No concern-benefit mappings are available for detected concern {concern_id}"
            )
        if concern_id not in active_scores:
            raise ValueError(
                f"No active relevance scores are available for detected concern {concern_id}"
            )


async def _mark_workflow_failed(db: AsyncSession, session_id: uuid.UUID) -> None:
    try:
        await db.rollback()
        await db.execute(
            update(CustomerSession)
            .where(CustomerSession.session_id == session_id)
            .values(session_status="ERROR", updated_at=text("CURRENT_TIMESTAMP"))
        )
        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Could not persist workflow failure session_id=%s", session_id)
