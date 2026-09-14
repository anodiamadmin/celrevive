import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.image_validation import ImageValidationResponse
from app.services.image_intake_service import accept_validated_image
from app.services.image_validation import decode_image, run_full_validation

router = APIRouter()


@router.post("/image-validation", response_model=ImageValidationResponse, status_code=status.HTTP_200_OK)
async def validate_and_accept_image(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    session_id: uuid.UUID = Form(...),
    db: AsyncSession = Depends(get_db),
):
    file_bytes = await image.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file upload.")

    validation = run_full_validation(file_bytes, image.content_type, get_settings())
    if not validation.is_valid:
        return ImageValidationResponse(valid=False, message=validation.message, reasons=validation.reasons)

    decoded = decode_image(file_bytes)
    if decoded is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Image could not be decoded.")
    height, width = decoded.shape[:2]

    try:
        image_id = await accept_validated_image(
            db,
            background_tasks,
            session_id=session_id,
            image_bytes=file_bytes,
            original_filename=image.filename,
            mime_type=image.content_type,
            image_width=width,
            image_height=height,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return ImageValidationResponse(
        valid=True,
        message="Image passed all quality checks.",
        image_id=str(image_id),
        next_step="questionnaire",
    )