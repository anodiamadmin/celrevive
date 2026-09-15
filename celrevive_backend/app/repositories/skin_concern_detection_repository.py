import uuid
from typing import List
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session_skin_concern_detection import SessionSkinConcernDetection
from app.models.skin_image import SkinImage
from app.schemas.visual_ai import ImageSkinConcern
from app.models.skin_concern import SkinConcern


async def store_visual_ai_detections(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    image_id: uuid.UUID,
    detections: List[ImageSkinConcern],
    raw_response_json: dict,
) -> None:
    """
    Persists all 28 validated per-concern verdicts for one Visual AI run.
    Idempotent per image_id — safe to call again on retry without duplicating rows.
    """
    image_result = await db.execute(
        select(SkinImage.session_id).where(SkinImage.image_id == image_id)
    )
    stored_session_id = image_result.scalar_one_or_none()
    if stored_session_id != session_id:
        raise ValueError("Image does not belong to the supplied customer session")

    # Clear any prior detection rows for this image (covers retries after a
    # failed/partial run). image_id FK is ON DELETE CASCADE from skin_image,
    # but we're deleting the detection rows directly here, not the image.
    await db.execute(
        delete(SessionSkinConcernDetection).where(SessionSkinConcernDetection.image_id == image_id)
    )

    rows = [
        SessionSkinConcernDetection(
            session_id=session_id,
            concern_id=detection.skin_concern_id,
            detection_source="IMAGE",
            image_id=image_id,
            questionnaire_response_id=None,
            skin_concern_exists=detection.skin_concern_exists,
            if_skin_concern_true_why=detection.if_skin_concern_true_why,
            raw_detection_json=raw_response_json,
        )
        for detection in detections
    ]
    db.add_all(rows)
    await db.commit()

async def get_detected_image_concerns_by_session(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
) -> List[str]:
    """
    Fetches the concern names for all validated IMAGE detections where
    skin_concern_exists is True for a given session.
    """
    stmt = (
        select(SkinConcern.concern_name)
        .join(
            SessionSkinConcernDetection,
            SkinConcern.concern_id == SessionSkinConcernDetection.concern_id,
        )
        .where(
            SessionSkinConcernDetection.session_id == session_id,
            SessionSkinConcernDetection.detection_source == "IMAGE",
            SessionSkinConcernDetection.skin_concern_exists.is_(True),
        )
        .distinct()  # <--- This guarantees no duplicates are returned
        .order_by(SkinConcern.concern_id.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())