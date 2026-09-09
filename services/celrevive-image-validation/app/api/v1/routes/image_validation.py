"""
POST /api/v1/image-validation

Receives the image from the Shopify widget and runs it through the
image-validation service (work item 1.1), returning a frontend-ready
pass/fail response (work item 1.3). This single call also satisfies 1.2
("combine all image-quality checks into one image-validation API call").
"""

import logging
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from app.core.config import get_settings
from app.schemas.image_validation import ImageValidationResponse
from app.services.image_persistence import persist_accepted_image
from app.services.image_validation import run_full_validation
from app.services.visual_ai import trigger_visual_ai_analysis

router = APIRouter()
logger = logging.getLogger("celrevive.image_validation")


@router.post(
    "/image-validation",
    response_model=ImageValidationResponse,
    status_code=status.HTTP_200_OK,
)
async def validate_image(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    session_id: UUID | None = Form(default=None),
) -> ImageValidationResponse:
    settings = get_settings()

    file_bytes = await image.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file upload.")

    result = run_full_validation(
        file_bytes=file_bytes,
        content_type=image.content_type,
        settings=settings,
    )

    logger.info(
        "image_validation result=%s reasons=%s metrics=%s",
        result.is_valid,
        [r.value for r in result.reasons],
        result.metrics.model_dump(),
    )

    if not result.is_valid:
        return ImageValidationResponse(
            valid=False,
            message=result.message,
            reasons=result.reasons,
        )

    if not image.content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image content type is required for persistence.",
        )

    try:
        persisted = persist_accepted_image(
            session_id=session_id,
            file_bytes=file_bytes,
            original_filename=image.filename,
            mime_type=image.content_type,
            image_width=result.metrics.width_px,
            image_height=result.metrics.height_px,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        logger.exception("Image persistence configuration is unavailable")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image persistence is temporarily unavailable.",
        ) from exc
    except Exception as exc:
        logger.exception("Failed to persist accepted image")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image persistence is temporarily unavailable.",
        ) from exc

    background_tasks.add_task(
        trigger_visual_ai_analysis,
        session_id=persisted.session_id,
        image_id=persisted.image_id,
        storage_uri=persisted.storage_uri,
        mime_type=image.content_type,
    )

    return ImageValidationResponse(
        valid=True,
        message=result.message,
        reasons=[],
        session_id=persisted.session_id,
        image_id=persisted.image_id,
    )
