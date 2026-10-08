import logging
import uuid
import asyncio

from sqlalchemy import text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.customer_session import CustomerSession
from app.services.visual_ai.client import (
    call_visual_ai,
    VisualAIAPIError,
    VisualAIMalformedResponseError,
)
from app.repositories.skin_concern_detection_repository import store_visual_ai_detections
from app.repositories.skin_image_repository import get_image_bytes_and_mime  # fetches from storage_uri

logger = logging.getLogger("visual_ai_task")


async def run_visual_ai_analysis(image_id: uuid.UUID, session_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        try:
            image_bytes, mime_type = await get_image_bytes_and_mime(db, image_id=image_id)

            result = await asyncio.to_thread(call_visual_ai, image_bytes, mime_type)

            await db.execute(
                update(CustomerSession)
                .where(CustomerSession.session_id == session_id)
                .values(
                    session_status="RECOMMENDATION_GENERATED",
                    updated_at=text("CURRENT_TIMESTAMP"),
                )
            )
            await store_visual_ai_detections(
                db,
                session_id=session_id,
                image_id=image_id,
                detections=result.validated.image_skin_concerns,
                raw_response_json=result.raw,
            )

            logger.info(
                "Visual AI analysis stored image_id=%s session_id=%s detected=%d",
                image_id, session_id, len(result.validated.detected_concerns),
            )

        except (VisualAIAPIError, VisualAIMalformedResponseError):
            await _mark_analysis_failed(db, image_id, session_id)
            logger.exception("Visual AI analysis failed for image_id=%s session_id=%s", image_id, session_id)
        except Exception:
            await _mark_analysis_failed(db, image_id, session_id)
            logger.exception("Visual AI background task failed for image_id=%s session_id=%s", image_id, session_id)


async def _mark_analysis_failed(
    db: AsyncSession,
    image_id: uuid.UUID,
    session_id: uuid.UUID,
) -> None:
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
        logger.exception(
            "Could not persist analysis failure image_id=%s session_id=%s",
            image_id,
            session_id,
        )
