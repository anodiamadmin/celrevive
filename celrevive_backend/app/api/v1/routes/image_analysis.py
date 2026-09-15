import uuid
from pathlib import Path
from typing import Optional
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.customer_session import CustomerSession

# Validation & Direct Storage Imports
from app.services.image_validation import decode_image, run_full_validation
from app.services.storage_service import save_image_bytes
from app.repositories.skin_image_repository import create_skin_image, mark_session_image_received

# AI & Detection Repository Imports
from app.services.visual_ai.client import call_visual_ai, VisualAIAPIError, VisualAIMalformedResponseError
from app.repositories.skin_concern_detection_repository import (
    store_visual_ai_detections,
    get_detected_image_concerns_by_session,
)
from app.schemas.recommendation import RecommendationResponse
router = APIRouter()

# Initialize the logger for this specific route
logger = logging.getLogger("celrevive_backend.api")

@router.post("/image-analysis", response_model=RecommendationResponse, status_code=status.HTTP_200_OK)
async def analyze_and_recommend(
        background_tasks: BackgroundTasks,
        image: UploadFile = File(...),
        session_id: uuid.UUID = Form(...),
        user_full_name: Optional[str] = Query(default=None),
        logged_in_customer_id: Optional[str] = Query(default=None, description="Injected by Shopify App Proxy"),
        db: AsyncSession = Depends(get_db),
):
    # 1. Read & Validate Image
    file_bytes = await image.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file upload.")

    validation = run_full_validation(file_bytes, image.content_type, get_settings())
    if not validation.is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation.message)

    decoded = decode_image(file_bytes)
    if decoded is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Image could not be decoded.")
    height, width = decoded.shape[:2]

    # 2. Persist Session
    session_stmt = select(CustomerSession).where(CustomerSession.session_id == session_id)
    result = await db.execute(session_stmt)
    session = result.scalar_one_or_none()

    if not session:
        session = CustomerSession(
            session_id=session_id,
            shopify_customer_id=logged_in_customer_id
        )
        db.add(session)
        await db.flush()

    # 3. Save Image to Object Storage Bucket (Bypassing `accept_validated_image`)
    # [REVIEW NEEDED]: We are bypassing `image_intake_service.py` to prevent it from queuing
    # a duplicate background task. The team must decide if we will maintain this synchronous
    # bypass for Sprint 1, or revert to the service layer and restore a separate GET polling endpoint.
    try:
        extension = Path(image.filename or "").suffix.lower() or ".bin"
        stored = save_image_bytes(file_bytes, session_id, extension)

        skin_img = await create_skin_image(
            db,
            session_id=session_id,
            storage_uri=stored.storage_uri,
            original_filename=image.filename,
            mime_type=image.content_type,
            file_size_bytes=stored.file_size_bytes,
            image_width=width,
            image_height=height,
            sha256=stored.sha256,
        )
        await mark_session_image_received(db, session_id=session_id)
        # Flush to ensure the image_id is available before the AI detection save
        await db.flush()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    # 4. Run AI Analysis Synchronously via GenAI SDK
    # [REVIEW NEEDED]: Executing the Gemini client synchronously inside the router threadpool.
    # Monitor TTFB (Time to First Byte) on the frontend to ensure this doesn't cause Shopify
    # App Proxy timeout errors (Shopify enforces a strict timeout on proxy responses).
    try:
        logger.info(f"Triggering Gemini AI for session_id: {session_id}")
        ai_result = await run_in_threadpool(call_visual_ai, file_bytes, image.content_type)
        # Log the raw success payload returned by Gemini
        logger.info(f"Gemini AI Success for {session_id}. Raw payload: {ai_result.raw}")

    except (VisualAIAPIError, VisualAIMalformedResponseError) as exc:
        # Log the exact failure reason
        logger.error(f"Gemini AI Failed for {session_id}. Reason: {str(exc)}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    await store_visual_ai_detections(db, session_id=session_id, image_id=skin_img.image_id,
        detections=ai_result.validated.image_skin_concerns,
        raw_response_json=ai_result.raw)
    await db.commit()

    # 5. Fetch Final Normalized Concerns
    detected_concerns = await get_detected_image_concerns_by_session(db, session_id=session_id)
    display_name = user_full_name.strip() if user_full_name and user_full_name.strip() else "Valued Customer"

    if not detected_concerns:
        final_response = RecommendationResponse(
            session_id=session_id,
            user_full_name=display_name,
            message="Your skin looks perfect!",
            primary_concerns=[],
        )
    else:
        final_response = RecommendationResponse(
            session_id=session_id,
            user_full_name=display_name,
            message="Primary skin concerns detected from image analysis.",
            primary_concerns=detected_concerns,
        )
    # Log the exact payload going back to the frontend
    # Using model_dump_json(indent=2) makes it highly readable in terminal
    logger.info(f"Final API Response payload for {session_id}:\n{final_response.model_dump_json(indent=2)}")
    # Return it to the Shopify widget
    return final_response