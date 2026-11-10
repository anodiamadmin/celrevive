import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import bindparam, delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer_session import CustomerSession
from app.models.questionnaire_response import QuestionnaireResponse
from app.models.recommendation import (
    RecommendationActive,
    RecommendationBase,
    RecommendationOutput,
    RecommendationRun,
)
from app.models.session_skin_concern import SessionSkinConcern
from app.models.session_skin_concern_detection import SessionSkinConcernDetection
from app.models.skin_concern import SkinConcern
from app.models.skin_image import SkinImage
from app.schemas.formulation import FormulationRecommendation
from app.schemas.customer_session import CombinedSkinConcernResponse
from app.schemas.questionnaire import QuestionnaireAnalysis
from app.services.questionnaire_ai.client import SKIN_TYPE_BY_ANSWER

MAX_RECOMMENDATION_CONCERNS = 5


async def store_questionnaire_detections(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    questionnaire_response_id: uuid.UUID,
    detections: QuestionnaireAnalysis,
    raw_response_json: dict[str, Any],
) -> None:
    response_result = await db.execute(
        select(QuestionnaireResponse).where(
            QuestionnaireResponse.questionnaire_response_id == questionnaire_response_id,
            QuestionnaireResponse.session_id == session_id,
        )
    )
    if response_result.scalar_one_or_none() is None:
        raise ValueError("Questionnaire response does not belong to the supplied session")

    concerns_result = await db.execute(
        select(SkinConcern)
    )
    concern_by_id = {item.concern_id: item for item in concerns_result.scalars().all()}
    detection_ids = [
        item.skin_concern_id for item in detections.questionnaire_skin_concerns
    ]
    detected_id_set = set(detection_ids)
    if len(detection_ids) != len(detected_id_set):
        raise ValueError("Questionnaire AI returned duplicate skin_concern_id values")

    unknown_ids = detected_id_set - set(concern_by_id)
    if unknown_ids:
        raise ValueError("Questionnaire AI returned an unknown skin_concern_id")
    allowed_ids = {
        concern_id
        for concern_id, concern in concern_by_id.items()
        if concern.detectable_by_questionnaire
    }
    unsupported = [
        item.skin_concern_id
        for item in detections.questionnaire_skin_concerns
        if item.skin_concern_id not in allowed_ids
    ]
    if unsupported:
        raise ValueError(
            "Questionnaire AI returned concerns not enabled for questionnaire detection: "
            + ", ".join(sorted(unsupported))
        )
    missing = allowed_ids - detected_id_set
    if missing:
        raise ValueError(
            "Questionnaire AI omitted concerns enabled for questionnaire detection: "
            + ", ".join(sorted(missing))
        )

    await db.execute(
        delete(SessionSkinConcernDetection).where(
            SessionSkinConcernDetection.questionnaire_response_id == questionnaire_response_id
        )
    )
    db.add_all(
        SessionSkinConcernDetection(
            session_id=session_id,
            concern_id=item.skin_concern_id,
            detection_source="QUESTIONNAIRE",
            image_id=None,
            questionnaire_response_id=questionnaire_response_id,
            skin_concern_exists=item.skin_concern_exists,
            confidence_score=item.confidence_score,
            if_skin_concern_true_why=item.if_skin_concern_true_why,
            raw_detection_json=raw_response_json,
        )
        for item in detections.questionnaire_skin_concerns
    )
    await db.commit()


async def get_latest_questionnaire_response(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
) -> QuestionnaireResponse | None:
    result = await db.execute(
        select(QuestionnaireResponse)
        .where(QuestionnaireResponse.session_id == session_id)
        .order_by(QuestionnaireResponse.submitted_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def workflow_detections_ready(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    questionnaire_response_id: uuid.UUID,
) -> bool:
    latest_image_result = await db.execute(
        select(SkinImage.image_id)
        .where(SkinImage.session_id == session_id)
        .order_by(SkinImage.uploaded_at.desc(), SkinImage.image_id.desc())
        .limit(1)
    )
    latest_image_id = latest_image_result.scalar_one_or_none()
    if latest_image_id is None:
        return False

    catalog_result = await db.execute(
        select(
            SkinConcern.concern_id,
            SkinConcern.detectable_by_selfie,
            SkinConcern.detectable_by_questionnaire,
        )
    )
    expected_image_ids: set[str] = set()
    expected_questionnaire_ids: set[str] = set()
    for concern_id, detectable_by_selfie, detectable_by_questionnaire in catalog_result.all():
        if detectable_by_selfie:
            expected_image_ids.add(concern_id)
        if detectable_by_questionnaire:
            expected_questionnaire_ids.add(concern_id)

    detections_result = await db.execute(
        select(
            SessionSkinConcernDetection.detection_source,
            SessionSkinConcernDetection.concern_id,
        )
        .where(
            SessionSkinConcernDetection.session_id == session_id,
            (
                (
                    (SessionSkinConcernDetection.detection_source == "IMAGE")
                    & (SessionSkinConcernDetection.image_id == latest_image_id)
                )
                | (
                    (SessionSkinConcernDetection.detection_source == "QUESTIONNAIRE")
                    & (
                        SessionSkinConcernDetection.questionnaire_response_id
                        == questionnaire_response_id
                    )
                )
            ),
        )
    )
    image_ids: list[str] = []
    questionnaire_ids: list[str] = []
    for source, concern_id in detections_result.all():
        if source == "IMAGE":
            image_ids.append(concern_id)
        else:
            questionnaire_ids.append(concern_id)
    return (
        len(image_ids) == len(expected_image_ids)
        and set(image_ids) == expected_image_ids
        and len(questionnaire_ids) == len(expected_questionnaire_ids)
        and set(questionnaire_ids) == expected_questionnaire_ids
    )


def merge_concern_detections(
    detections: list[SessionSkinConcernDetection],
    concern_names: dict[str, str],
) -> list[dict[str, Any]]:
    by_concern: dict[str, dict[str, Any]] = {}
    for detection in detections:
        concern = by_concern.setdefault(
            detection.concern_id,
            {
                "skin_concern_id": detection.concern_id,
                "image_skin_concern_exists": False,
                "questionnaire_skin_concern_exists": False,
                "sources_seen": set(),
                "explanations": [],
                "confidence_scores": [],
            },
        )
        if detection.detection_source in concern["sources_seen"]:
            raise ValueError(
                f"Multiple {detection.detection_source.lower()} detections exist "
                f"for concern {detection.concern_id}"
            )
        concern["sources_seen"].add(detection.detection_source)
        source_key = (
            "image_skin_concern_exists"
            if detection.detection_source == "IMAGE"
            else "questionnaire_skin_concern_exists"
        )
        concern[source_key] = detection.skin_concern_exists
        if detection.skin_concern_exists:
            if detection.confidence_score is not None:
                concern["confidence_scores"].append(float(detection.confidence_score))
            if detection.if_skin_concern_true_why.strip():
                label = "Image" if detection.detection_source == "IMAGE" else "Questionnaire"
                concern["explanations"].append(
                    f"{label}: {detection.if_skin_concern_true_why.strip()}"
                )

    concern_ids = set(by_concern)
    if set(concern_names) != concern_ids:
        raise ValueError("Detection result includes a concern missing from the master catalog")

    combined: list[dict[str, Any]] = []
    for concern_id, item in sorted(by_concern.items()):
        image_exists = item["image_skin_concern_exists"]
        questionnaire_exists = item["questionnaire_skin_concern_exists"]
        exists = image_exists or questionnaire_exists
        combined_item = {
            "skin_concern_id": concern_id,
            "skin_concern_name": concern_names[concern_id],
            "image_skin_concern_exists": image_exists,
            "questionnaire_skin_concern_exists": questionnaire_exists,
            "skin_concern_exists": exists,
            "if_skin_concern_true_why": " ".join(item["explanations"]) if exists else "",
            "confidence_score": max(item["confidence_scores"], default=0.0),
        }
        if combined_item["skin_concern_exists"] != (
            combined_item["image_skin_concern_exists"]
            or combined_item["questionnaire_skin_concern_exists"]
        ):
            raise ValueError("Combined concern validation failed")
        combined.append(combined_item)
    return combined


def select_recommendation_concerns(
    combined_concerns: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Rank OR-positive concerns by their strongest source confidence and cap at five."""
    return sorted(
        (item for item in combined_concerns if item["skin_concern_exists"]),
        key=lambda item: (
            -float(item.get("confidence_score") or 0.0),
            item["skin_concern_id"],
        ),
    )[:MAX_RECOMMENDATION_CONCERNS]


async def combine_skin_concerns(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    questionnaire_response_id: uuid.UUID,
) -> list[dict[str, Any]]:
    latest_image_result = await db.execute(
        select(SkinImage.image_id)
        .where(SkinImage.session_id == session_id)
        .order_by(SkinImage.uploaded_at.desc(), SkinImage.image_id.desc())
        .limit(1)
    )
    latest_image_id = latest_image_result.scalar_one_or_none()
    if latest_image_id is None:
        raise ValueError("No image has been uploaded for the session")

    await db.execute(
        select(CustomerSession.session_id)
        .where(CustomerSession.session_id == session_id)
        .with_for_update()
    )
    result = await db.execute(
        select(SessionSkinConcernDetection).where(
            SessionSkinConcernDetection.session_id == session_id,
            (
                (
                    (SessionSkinConcernDetection.detection_source == "IMAGE")
                    & (SessionSkinConcernDetection.image_id == latest_image_id)
                )
                | (
                    (SessionSkinConcernDetection.detection_source == "QUESTIONNAIRE")
                    & (
                        SessionSkinConcernDetection.questionnaire_response_id
                        == questionnaire_response_id
                    )
                )
            ),
        )
    )
    detections = result.scalars().all()
    concern_ids = {detection.concern_id for detection in detections}
    master_result = await db.execute(
        select(
            SkinConcern.concern_id,
            func.coalesce(
                SkinConcern.skin_concern_display_name,
                SkinConcern.concern_name,
            ),
        ).where(SkinConcern.concern_id.in_(concern_ids))
    )
    concern_names = dict(master_result.all())
    combined = merge_concern_detections(detections, concern_names)

    await db.execute(
        delete(SessionSkinConcern).where(SessionSkinConcern.session_id == session_id)
    )
    db.add_all(
        SessionSkinConcern(
            session_id=session_id,
            concern_id=item["skin_concern_id"],
            image_skin_concern_exists=item["image_skin_concern_exists"],
            questionnaire_skin_concern_exists=item["questionnaire_skin_concern_exists"],
            skin_concern_exists=item["skin_concern_exists"],
            if_skin_concern_true_why=item["if_skin_concern_true_why"],
        )
        for item in combined
    )
    await db.execute(
        text(
            "UPDATE customer_session "
            "SET session_status = 'CONCERNS_COMBINED', updated_at = CURRENT_TIMESTAMP "
            "WHERE session_id = :session_id"
        ),
        {"session_id": session_id},
    )
    await db.commit()
    return combined


async def get_combined_skin_concerns(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
) -> list[CombinedSkinConcernResponse] | None:
    result = await db.execute(
        select(
            SessionSkinConcern,
            func.coalesce(
                SkinConcern.skin_concern_display_name,
                SkinConcern.concern_name,
            ),
        )
        .join(SkinConcern, SkinConcern.concern_id == SessionSkinConcern.concern_id)
        .where(SessionSkinConcern.session_id == session_id)
        .order_by(SessionSkinConcern.concern_id)
    )
    rows = result.all()
    if not rows:
        return None

    return [
        CombinedSkinConcernResponse(
            skin_concern_id=concern.concern_id,
            skin_concern_name=concern_name,
            image_skin_concern_exists=concern.image_skin_concern_exists,
            questionnaire_skin_concern_exists=concern.questionnaire_skin_concern_exists,
            skin_concern_exists=concern.skin_concern_exists,
            if_skin_concern_true_why=concern.if_skin_concern_true_why,
        )
        for concern, concern_name in rows
    ]


async def get_formulation_candidate_information(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    questionnaire_response_id: uuid.UUID,
    combined_concerns: list[dict[str, Any]],
) -> dict[str, Any]:
    positive_concerns = select_recommendation_concerns(combined_concerns)
    concern_ids = [item["skin_concern_id"] for item in positive_concerns]
    answer_result = await db.execute(
        select(QuestionnaireResponse.response_json).where(
            QuestionnaireResponse.questionnaire_response_id == questionnaire_response_id,
            QuestionnaireResponse.session_id == session_id,
        )
    )
    questionnaire_json = answer_result.scalar_one_or_none()
    if questionnaire_json is None:
        raise ValueError("Questionnaire response not found for the session")

    concern_benefits: list[dict[str, Any]] = []
    active_benefit_scores: list[dict[str, Any]] = []
    active_concern_scores: list[dict[str, Any]] = []
    if concern_ids:
        id_list = bindparam("concern_ids", expanding=True)
        mappings_result = await db.execute(
            text(
                """
                SELECT cb.concern_id, cb.benefit_id, benefit.benefit_name,
                       cb.mapping_version, cb.weight, cb.relevance_type,
                       cb.evidence_level, cb.rationale
                FROM vw_current_concern_benefit AS cb
                JOIN benefit ON benefit.benefit_id = cb.benefit_id
                WHERE cb.concern_id IN :concern_ids
                ORDER BY cb.concern_id, cb.weight DESC, cb.benefit_id
                """
            ).bindparams(id_list),
            {"concern_ids": concern_ids},
        )
        concern_benefits = [dict(row) for row in mappings_result.mappings().all()]

        scores_result = await db.execute(
            text(
                """
                SELECT score.active_id, active.active_name, score.benefit_id,
                       benefit.benefit_name, score.score_version, score.score
                FROM vw_current_active_benefit_score AS score
                JOIN active ON active.active_id = score.active_id
                JOIN benefit ON benefit.benefit_id = score.benefit_id
                WHERE score.benefit_id IN (
                    SELECT DISTINCT cb.benefit_id
                    FROM vw_current_concern_benefit AS cb
                    WHERE cb.concern_id IN :concern_ids
                )
                ORDER BY score.active_id, score.benefit_id
                """
            ).bindparams(id_list),
            {"concern_ids": concern_ids},
        )
        active_benefit_scores = [
            dict(row) for row in scores_result.mappings().all()
        ]
        relevance_result = await db.execute(
            text(
                """
                SELECT concern_id, active_id, active_name, relevance_score_0_100,
                       mapping_evidence_floor, mapped_benefit_count
                FROM vw_active_concern_score
                WHERE concern_id IN :concern_ids
                ORDER BY concern_id, relevance_score_0_100 DESC, active_id
                """
            ).bindparams(id_list),
            {"concern_ids": concern_ids},
        )
        active_concern_scores = [
            dict(row) for row in relevance_result.mappings().all()
        ]

    base_result = await db.execute(
        text(
            """
            SELECT base_id, base_name, price_tier, age_min, age_max, skin_type,
                   moisture, description
            FROM base
            ORDER BY base_id
            """
        )
    )
    active_result = await db.execute(
        text(
            """
            SELECT active_id, active_name, usage_level_min, usage_level_max,
                   description
            FROM active
            ORDER BY active_id
            """
        )
    )
    compatibility_result = await db.execute(
        text(
            """
            SELECT bac.base_id, base.base_name, bac.active_id, active.active_name,
                   bac.note
            FROM base_active_compatibility AS bac
            JOIN base ON base.base_id = bac.base_id
            JOIN active ON active.active_id = bac.active_id
            WHERE bac.is_compatible IS TRUE
            ORDER BY bac.base_id, bac.active_id
            """
        )
    )
    return _json_safe({
        "questionnaire_user_answer": questionnaire_json,
        "combined_skin_concerns": positive_concerns,
        "concern_benefit_mappings": concern_benefits,
        "active_benefit_scores": active_benefit_scores,
        "active_concern_scores": active_concern_scores,
        "candidate_bases": [
            dict(row) for row in base_result.mappings().all()
        ],
        "candidate_actives": [
            dict(row) for row in active_result.mappings().all()
        ],
        "compatible_base_active_pairs": [
            dict(row) for row in compatibility_result.mappings().all()
        ],
    })


def _json_safe(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    return value


async def start_recommendation_run(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    candidate_information: dict[str, Any],
    model_name: str,
) -> uuid.UUID | None:
    await db.execute(
        select(CustomerSession.session_id)
        .where(CustomerSession.session_id == session_id)
        .with_for_update()
    )
    existing_output = await get_latest_recommendation_output(db, session_id=session_id)
    if existing_output is not None:
        await db.rollback()
        return None

    active_run_result = await db.execute(
        select(RecommendationRun)
        .where(
            RecommendationRun.session_id == session_id,
            RecommendationRun.recommendation_status.in_(
                ["STARTED", "RAG_RETRIEVED", "GENERATED", "FORMATTED", "RETURNED"]
            ),
        )
        .order_by(RecommendationRun.created_at.desc())
        .limit(1)
    )
    if active_run_result.scalar_one_or_none() is not None:
        await db.rollback()
        return None

    recommendation_id = uuid.uuid4()
    run = RecommendationRun(
        recommendation_id=recommendation_id,
        session_id=session_id,
        model_provider="google",
        model_name=model_name,
        prompt_version="formulation-v1",
        rag_version="database-v1",
        input_skin_concerns_json={
            "combined_skin_concerns": candidate_information["combined_skin_concerns"]
        },
        rag_context_json=candidate_information,
        recommendation_status="RAG_RETRIEVED",
    )
    db.add(run)
    await db.commit()
    return recommendation_id


async def persist_recommendation(
    db: AsyncSession,
    *,
    recommendation_id: uuid.UUID,
    session_id: uuid.UUID,
    candidate_information: dict[str, Any],
    recommendation: FormulationRecommendation,
) -> uuid.UUID:
    scores_by_active = validate_recommendation_selection(
        candidate_information,
        recommendation,
    )

    run_result = await db.execute(
        select(RecommendationRun).where(
            RecommendationRun.recommendation_id == recommendation_id,
            RecommendationRun.session_id == session_id,
            RecommendationRun.recommendation_status == "RAG_RETRIEVED",
        )
    )
    run = run_result.scalar_one_or_none()
    if run is None:
        raise ValueError("Recommendation run is not available for completion")
    session_result = await db.execute(
        select(CustomerSession.shopify_customer_name).where(
            CustomerSession.session_id == session_id
        )
    )
    user_full_name = session_result.scalar_one_or_none()
    run.recommendation_status = "GENERATED"
    run.overall_explanation = recommendation.overall_explanation
    run.completed_at = func.current_timestamp()
    db.add(
        RecommendationBase(
            recommendation_id=recommendation_id,
            base_id=recommendation.base_id,
            recommendation_rank=1,
            base_selected=True,
            if_base_selected_why=recommendation.if_base_selected_why,
        )
    )
    db.add_all(
        RecommendationActive(
            recommendation_id=recommendation_id,
            base_id=recommendation.base_id,
            active_id=active.active_id,
            recommendation_rank=rank,
            active_selected=True,
            if_active_selected_why=active.if_active_selected_why,
            recommendation_score=max(scores_by_active[active.active_id].values()),
        )
        for rank, active in enumerate(recommendation.actives, start=1)
    )

    output_json = build_recommendation_output(
        recommendation_id=recommendation_id,
        session_id=session_id,
        user_full_name=user_full_name,
        candidate_information=candidate_information,
        recommendation=recommendation,
    )
    db.add(
        RecommendationOutput(
            recommendation_id=recommendation_id,
            output_json=output_json,
        )
    )
    await db.execute(
        text(
            "UPDATE customer_session "
            "SET session_status = 'RECOMMENDATION_GENERATED', "
            "updated_at = CURRENT_TIMESTAMP WHERE session_id = :session_id"
        ),
        {"session_id": session_id},
    )
    await db.commit()
    return recommendation_id


def build_recommendation_output(
    *,
    recommendation_id: uuid.UUID,
    session_id: uuid.UUID,
    user_full_name: str | None,
    candidate_information: dict[str, Any],
    recommendation: FormulationRecommendation,
) -> dict[str, Any]:
    bases_by_id = {
        int(item["base_id"]): item
        for item in candidate_information["candidate_bases"]
    }
    actives_by_id = {
        int(item["active_id"]): item
        for item in candidate_information["candidate_actives"]
    }
    selected_base = bases_by_id[recommendation.base_id]
    base_name = selected_base["base_name"]
    questionnaire = candidate_information["questionnaire_user_answer"]["questionnaire"]
    q1_answer = next(
        question["user_response"]
        for section in questionnaire["sections"]
        for question in section["questions"]
        if question["question_id"] == "q1"
    )
    recommended_actives = []
    for active in recommendation.actives:
        catalog_active = actives_by_id[active.active_id]
        recommended_actives.append(
            {
                "active_id": active.active_id,
                "active_name": catalog_active["active_name"],
                "if_active_selected_why": active.if_active_selected_why,
                "recommended_usage_percentage": catalog_active["usage_level_min"],
            }
        )

    return {
        "session_id": str(session_id),
        "recommendation_id": str(recommendation_id),
        "user_full_name": user_full_name,
        "skin_concerns": candidate_information["combined_skin_concerns"],
        "skin_type": SKIN_TYPE_BY_ANSWER[q1_answer],
        "recommended_base": {
            "base_id": recommendation.base_id,
            "base_name": base_name,
            "if_base_selected_why": recommendation.if_base_selected_why,
        },
        "recommended_actives": recommended_actives,
        "formulation_weight_g": (
            50 if base_name.strip().casefold() in {"oil", "serum"} else 100
        ),
        "overall_explanation": recommendation.overall_explanation,
        "safety_notice": recommendation.safety_notice,
    }


def validate_recommendation_selection(
    candidate_information: dict[str, Any],
    recommendation: FormulationRecommendation,
) -> dict[int, dict[str, float]]:
    if len(candidate_information["combined_skin_concerns"]) > MAX_RECOMMENDATION_CONCERNS:
        raise ValueError(
            "Formulation candidate set exceeds the maximum of "
            f"{MAX_RECOMMENDATION_CONCERNS} skin concerns"
        )

    base_candidates = {
        int(item["base_id"]) for item in candidate_information["candidate_bases"]
    }
    active_candidates = {
        int(item["active_id"]) for item in candidate_information["candidate_actives"]
    }
    active_candidates_by_id = {
        int(item["active_id"]): item
        for item in candidate_information["candidate_actives"]
    }
    if recommendation.base_id not in base_candidates:
        raise ValueError("Formulation AI selected a base outside the candidate catalog")

    compatible_pairs = {
        (int(item["base_id"]), int(item["active_id"]))
        for item in candidate_information["compatible_base_active_pairs"]
    }
    scores_by_active: dict[int, dict[str, float]] = {}
    for item in candidate_information["active_concern_scores"]:
        score = float(item["relevance_score_0_100"])
        if score > 0:
            scores_by_active.setdefault(int(item["active_id"]), {})[
                item["concern_id"]
            ] = score

    selected_active_ids = [item.active_id for item in recommendation.actives]
    if len(selected_active_ids) != len(set(selected_active_ids)):
        raise ValueError("Formulation AI returned duplicate active ingredients")
    for active_id in selected_active_ids:
        if active_id not in active_candidates:
            raise ValueError(
                f"Formulation AI selected an active outside the candidate catalog: {active_id}"
            )
        if active_candidates_by_id[active_id]["usage_level_min"] is None:
            raise ValueError(
                f"Recommended usage level is missing for active {active_id}"
            )
        if (recommendation.base_id, active_id) not in compatible_pairs:
            raise ValueError(
                f"Formulation AI selected active {active_id} incompatible with base "
                f"{recommendation.base_id}"
            )
        if not scores_by_active.get(active_id):
            raise ValueError(
                f"Formulation AI selected active {active_id} with no positive concern relevance"
            )

    detected_concern_ids = {
        item["skin_concern_id"]
        for item in candidate_information["combined_skin_concerns"]
    }
    covered_concern_ids = set().union(
        *(set(scores_by_active.get(active_id, {})) for active_id in selected_active_ids)
    ) if selected_active_ids else set()
    if detected_concern_ids and not detected_concern_ids.issubset(covered_concern_ids):
        missing = sorted(detected_concern_ids - covered_concern_ids)
        raise ValueError(
            "Formulation AI selected actives do not address every detected concern: "
            + ", ".join(missing)
        )
    if not detected_concern_ids and selected_active_ids:
        raise ValueError("Formulation AI must not select actives when no concerns were detected")
    return scores_by_active


async def mark_recommendation_run_failed(
    db: AsyncSession,
    *,
    recommendation_id: uuid.UUID,
    session_id: uuid.UUID,
    message: str,
) -> None:
    result = await db.execute(
        select(RecommendationRun).where(
            RecommendationRun.recommendation_id == recommendation_id,
            RecommendationRun.session_id == session_id,
        )
    )
    run = result.scalar_one_or_none()
    if run is not None:
        run.recommendation_status = "ERROR"
        run.error_message = message[:2000]
        run.completed_at = func.current_timestamp()
    await db.execute(
        text(
            "UPDATE customer_session SET session_status = 'ERROR', "
            "updated_at = CURRENT_TIMESTAMP WHERE session_id = :session_id"
        ),
        {"session_id": session_id},
    )
    await db.commit()


async def get_latest_recommendation_output(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
) -> dict[str, Any] | None:
    result = await db.execute(
        select(RecommendationOutput.output_json)
        .join(
            RecommendationRun,
            RecommendationRun.recommendation_id
            == RecommendationOutput.recommendation_id,
        )
        .where(RecommendationRun.session_id == session_id)
        .order_by(RecommendationRun.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
