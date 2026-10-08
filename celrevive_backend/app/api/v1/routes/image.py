import uuid

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.image_validation import ImageValidationResponse
from app.services.image_intake_service import accept_validated_image
from app.services.image_validation import run_full_validation

router = APIRouter()


async def _validate_and_queue_image(
    background_tasks: BackgroundTasks,
    image: UploadFile,
    session_id: uuid.UUID,
    db: AsyncSession,
) -> ImageValidationResponse:
    file_bytes = await image.read()
    validation = await run_in_threadpool(
        run_full_validation,
        file_bytes,
        image.content_type,
        get_settings(),
    )
    if not validation.is_valid:
        return ImageValidationResponse(
            valid=False,
            message=validation.message,
            reasons=validation.reasons,
        )

    try:
        image_id = await accept_validated_image(
            db,
            background_tasks,
            session_id=session_id,
            image_bytes=file_bytes,
            original_filename=image.filename,
            mime_type=image.content_type,
            image_width=validation.metrics.width_px,
            image_height=validation.metrics.height_px,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return ImageValidationResponse(
        valid=True,
        message=validation.message,
        reasons=[],
        image_id=str(image_id),
        next_step="questionnaire",
    )


@router.post("/image-validation", response_model=ImageValidationResponse)
async def validate_image(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    session_id: uuid.UUID = Form(...),
    db: AsyncSession = Depends(get_db),
) -> ImageValidationResponse:
    return await _validate_and_queue_image(background_tasks, image, session_id, db)


@router.post(
    "/image-analysis",
    response_model=ImageValidationResponse,
    status_code=status.HTTP_202_ACCEPTED,
    deprecated=True,
)
async def accept_image_for_analysis(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    session_id: uuid.UUID = Form(...),
    db: AsyncSession = Depends(get_db),
) -> ImageValidationResponse:
    return await _validate_and_queue_image(background_tasks, image, session_id, db)
