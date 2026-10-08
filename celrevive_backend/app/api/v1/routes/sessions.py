import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.customer_session import CustomerSession
from app.repositories.skin_concern_detection_repository import (
    get_detected_image_concerns_by_session,
)
from app.schemas.customer_session import (
    CustomerSessionCreate,
    CustomerSessionResponse,
    ImageAnalysisStatusResponse,
)

router = APIRouter()


@router.post(
    "/sessions",
    response_model=CustomerSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_customer_session(
    session_data: CustomerSessionCreate,
    db: AsyncSession = Depends(get_db),
) -> CustomerSessionResponse:
    if not session_data.consent_given:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent is required to create a customer session.",
        )

    session = CustomerSession(
        session_id=uuid.uuid4(),
        shopify_customer_id=session_data.shopify_customer_id,
        shopify_customer_email=session_data.shopify_customer_email,
        shopify_cart_id=session_data.shopify_cart_id,
        shopify_checkout_id=session_data.shopify_checkout_id,
        consent_given=session_data.consent_given,
        session_status="STARTED",
        notes=session_data.notes,
    )
    db.add(session)
    await db.commit()

    return CustomerSessionResponse(
        session_id=session.session_id,
        session_status=session.session_status,
    )


@router.get(
    "/sessions/{session_id}/analysis",
    response_model=ImageAnalysisStatusResponse,
)
async def get_image_analysis_status(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ImageAnalysisStatusResponse:
    result = await db.execute(
        select(CustomerSession).where(CustomerSession.session_id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer session not found.",
        )

    if session.session_status == "ERROR":
        return ImageAnalysisStatusResponse(
            session_id=session_id,
            analysis_status="failed",
            message="Image analysis failed. Please upload the image again.",
        )
    if session.session_status == "RECOMMENDATION_GENERATED":
        concerns = await get_detected_image_concerns_by_session(
            db,
            session_id=session_id,
        )
        return ImageAnalysisStatusResponse(
            session_id=session_id,
            analysis_status="completed",
            message="Image analysis completed.",
            primary_concerns=concerns,
        )
    if session.session_status == "IMAGE_RECEIVED":
        return ImageAnalysisStatusResponse(
            session_id=session_id,
            analysis_status="pending",
            message="Image analysis is in progress.",
        )

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Image analysis has not been submitted for this session.",
    )
