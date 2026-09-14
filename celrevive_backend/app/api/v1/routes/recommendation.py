import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.customer_session import CustomerSession
from app.repositories.skin_concern_detection_repository import (
    get_detected_image_concerns_by_session,
)
from app.schemas.recommendation import RecommendationResponse

router = APIRouter()


@router.get(
    "/{session_id}",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
)
async def get_image_recommendation(
    session_id: uuid.UUID,
    user_full_name: Optional[str] = Query(
        default=None,
        description="Customer full name passed from the storefront Liquid template/widget",
    ),
    db: AsyncSession = Depends(get_db),
) -> RecommendationResponse:
    # Verify customer session exists
    session_stmt = select(CustomerSession).where(
        CustomerSession.session_id == session_id
    )
    result = await db.execute(session_stmt)
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer session not found.",
        )

    # Resolve display name fallback
    display_name = user_full_name.strip() if user_full_name and user_full_name.strip() else "Valued Customer"

    # Retrieves validated visual AI concerns
    detected_concerns = await get_detected_image_concerns_by_session(
        db, session_id=session_id
    )

    # Handles clean skin edge-case
    if not detected_concerns:
        return RecommendationResponse(
            user_full_name=display_name,
            message="Your skin looks perfect!",
            primary_concerns=[],
        )

    return RecommendationResponse(
        user_full_name=display_name,
        message="Primary skin concerns detected from image analysis.",
        primary_concerns=detected_concerns,
    )