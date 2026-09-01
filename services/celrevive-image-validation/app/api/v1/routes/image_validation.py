"""
POST /api/v1/image-validation

Receives the image from the Shopify widget and runs it through the
image-validation service (work item 1.1), returning a frontend-ready
pass/fail response (work item 1.3). This single call also satisfies 1.2
("combine all image-quality checks into one image-validation API call").
"""

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.config import get_settings
from app.schemas.image_validation import ImageValidationResponse
from app.services.image_validation import run_full_validation

router = APIRouter()
logger = logging.getLogger("celrevive.image_validation")


@router.post(
    "/image-validation",
    response_model=ImageValidationResponse,
    status_code=status.HTTP_200_OK,
)
async def validate_image(image: UploadFile = File(...)) -> ImageValidationResponse:
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

    return ImageValidationResponse(
        valid=result.is_valid,
        message=result.message,
        reasons=result.reasons,
    )
