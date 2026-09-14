import logging
import uuid
import asyncio

from app.core.database import AsyncSessionLocal
from app.services.visual_ai.client import call_visual_ai, VisualAIAPIError, VisualAIMalformedResponseError
from app.repositories.skin_concern_detection_repository import store_visual_ai_detections
from app.repositories.skin_image_repository import get_image_bytes_and_mime  # fetches from storage_uri

logger = logging.getLogger("visual_ai_task")


async def run_visual_ai_analysis(image_id: uuid.UUID, session_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        try:
            image_bytes, mime_type = await get_image_bytes_and_mime(db, image_id=image_id)

            result = await asyncio.to_thread(call_visual_ai, image_bytes, mime_type)

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

        except VisualAIAPIError:
            logger.exception("Visual AI API unavailable for image_id=%s session_id=%s", image_id, session_id)
            # TODO: mark session_status='ERROR' or queue a retry
        except VisualAIMalformedResponseError:
            logger.exception("Visual AI returned unusable output for image_id=%s session_id=%s", image_id, session_id)
            # TODO: mark session_status='ERROR' or queue a retry
        except Exception:
            logger.exception("Visual AI background task failed for image_id=%s session_id=%s", image_id, session_id)
