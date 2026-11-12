import os
from pathlib import Path
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.customer_session import CustomerSession
from app.models.skin_image import SkinImage
from app.repositories.admin_repository import (
    get_recent_sessions_summary,
    get_session_combined_concerns,
    get_session_detections_by_source,
    get_session_latest_image,
    get_session_questionnaire_answers,
    get_session_recommendation_detail,
)
from app.services.shopify_order_service import exchange_session_token_for_offline_token
from app.services.storage_service import read_image_bytes

router = APIRouter(tags=["admin-dashboard"])

TEMPLATES_DIR = Path(__file__).resolve().parents[3] / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


@router.get("/", response_class=HTMLResponse, include_in_schema=False)
@router.get("/admin", response_class=HTMLResponse)
async def render_admin_dashboard(
    request: Request,
    ref: Optional[str] = Query(
        default=None,
        description="Internal scan reference (defaults to latest upload).",
    ),
    min_confidence: float = Query(
        default=0.5,
        ge=0.0,
        le=1.0,
    ),
    db: AsyncSession = Depends(get_db),
) -> HTMLResponse:
    # Automatically exchange Shopify's id_token for a permanent offline shpat_ token
    # and persist it to .env whenever the app is opened inside Shopify Admin
    id_token = request.query_params.get("id_token")
    shop = request.query_params.get(
        "shop", os.getenv("SHOPIFY_STORE_DOMAIN", "46a312.myshopify.com")
    )
    if id_token:
        await exchange_session_token_for_offline_token(shop, id_token)

    recent_sessions = await get_recent_sessions_summary(db, limit=30)

    target_uuid: Optional[uuid.UUID] = None
    active_scan_label = "Latest Scan"
    active_customer_label = "Guest Tester"

    if ref and ref.strip():
        try:
            target_uuid = uuid.UUID(ref.strip())
        except ValueError:
            target_uuid = None

    if target_uuid is None and recent_sessions:
        target_uuid = uuid.UUID(recent_sessions[0]["_internal_id"])

    for item in recent_sessions:
        if target_uuid and item["_internal_id"] == str(target_uuid):
            active_scan_label = item["scan_label"]
            active_customer_label = item["customer_label"]
            break

    selected_session = None
    latest_image = None
    image_detections = []
    questionnaire_detections = []
    questionnaire_answers = []
    combined_concerns = []
    recommendation_detail = None

    if target_uuid:
        session_res = await db.execute(
            select(CustomerSession).where(CustomerSession.session_id == target_uuid)
        )
        selected_session = session_res.scalar_one_or_none()

        if selected_session is not None:
            latest_image = await get_session_latest_image(db, session_id=target_uuid)
            image_detections = await get_session_detections_by_source(
                db, session_id=target_uuid, detection_source="IMAGE"
            )
            questionnaire_detections = await get_session_detections_by_source(
                db, session_id=target_uuid, detection_source="QUESTIONNAIRE"
            )
            questionnaire_answers = await get_session_questionnaire_answers(
                db, session_id=target_uuid
            )
            combined_concerns = await get_session_combined_concerns(
                db, session_id=target_uuid
            )
            recommendation_detail = await get_session_recommendation_detail(
                db, session_id=target_uuid
            )

    return templates.TemplateResponse(
        request=request,
        name="admin_dashboard.html",
        context={
            "recent_sessions": recent_sessions,
            "selected_session": selected_session,
            "selected_ref": str(target_uuid) if target_uuid else "",
            "active_scan_label": active_scan_label,
            "active_customer_label": active_customer_label,
            "latest_image": latest_image,
            "image_detections": image_detections,
            "questionnaire_detections": questionnaire_detections,
            "questionnaire_answers": questionnaire_answers,
            "combined_concerns": combined_concerns,
            "recommendation_detail": recommendation_detail,
            "default_min_confidence": min_confidence,
        },
    )


@router.get("/admin/image/{image_id}")
async def serve_session_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Response:
    res = await db.execute(select(SkinImage).where(SkinImage.image_id == image_id))
    skin_image = res.scalar_one_or_none()
    if skin_image is None or not skin_image.storage_uri:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        image_bytes = read_image_bytes(skin_image.storage_uri)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Image file missing from disk") from exc

    media_type = skin_image.mime_type or "image/jpeg"
    return Response(content=image_bytes, media_type=media_type)