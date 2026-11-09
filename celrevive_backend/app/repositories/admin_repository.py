import uuid
from typing import Any

from sqlalchemy import case, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer_session import CustomerSession
from app.models.questionnaire_response import QuestionnaireResponse
from app.models.recommendation import RecommendationOutput, RecommendationRun
from app.models.session_skin_concern import SessionSkinConcern
from app.models.session_skin_concern_detection import SessionSkinConcernDetection
from app.models.skin_concern import SkinConcern
from app.models.skin_image import SkinImage


async def get_recent_sessions_summary(
    db: AsyncSession,
    *,
    limit: int = 30,
) -> list[dict[str, Any]]:
    """
    Fetches the most recent customer sessions ordered by CustomerSession.created_at DESC,
    including the latest uploaded image_id and count of flagged image concerns (>= 0.5).
    """
    latest_image_id_subq = (
        select(SkinImage.image_id)
        .where(SkinImage.session_id == CustomerSession.session_id)
        .order_by(desc(SkinImage.uploaded_at), desc(SkinImage.image_id))
        .limit(1)
        .correlate(CustomerSession)
        .scalar_subquery()
    )

    flagged_image_count = func.count(
        case(
            (
                (SessionSkinConcernDetection.detection_source == "IMAGE")
                & (SessionSkinConcernDetection.skin_concern_exists.is_(True))
                & (SessionSkinConcernDetection.confidence_score >= 0.5),
                1,
            )
        )
    ).label("flagged_concerns_count")

    stmt = (
        select(
            CustomerSession.session_id,
            CustomerSession.shopify_customer_email,
            CustomerSession.shopify_customer_id,
            CustomerSession.session_status,
            CustomerSession.created_at,
            flagged_image_count,
            latest_image_id_subq.label("latest_image_id"),
        )
        .outerjoin(
            SessionSkinConcernDetection,
            CustomerSession.session_id == SessionSkinConcernDetection.session_id,
        )
        .group_by(
            CustomerSession.session_id,
            CustomerSession.shopify_customer_email,
            CustomerSession.shopify_customer_id,
            CustomerSession.session_status,
            CustomerSession.created_at,
        )
        .order_by(desc(CustomerSession.created_at))
        .limit(limit)
    )

    result = await db.execute(stmt)
    rows = result.all()

    total_rows = len(rows)
    sessions: list[dict[str, Any]] = []
    for idx, row in enumerate(rows):
        customer_label = (
            row.shopify_customer_email
            or row.shopify_customer_id
            or "Guest Tester"
        )
        sessions.append(
            {
                "_internal_id": str(row.session_id),
                "scan_label": f"Scan #{total_rows - idx}",
                "customer_label": customer_label,
                "session_status": row.session_status,
                "created_at": row.created_at,
                "flagged_concerns_count": row.flagged_concerns_count or 0,
                "image_id": str(row.latest_image_id) if row.latest_image_id else None,
            }
        )
    return sessions


async def get_session_latest_image(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
) -> SkinImage | None:
    """Returns the latest SkinImage row for a session."""
    stmt = (
        select(SkinImage)
        .where(SkinImage.session_id == session_id)
        .order_by(desc(SkinImage.uploaded_at), desc(SkinImage.image_id))
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_session_detections_by_source(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
    detection_source: str = "IMAGE",
) -> list[dict[str, Any]]:
    """
    Executes the exact client SQL JOIN query for either 'IMAGE' or 'QUESTIONNAIRE':
        SELECT
            d.session_id,
            d.concern_id,
            c.concern_name,
            c.skin_concern_display_name,
            d.if_skin_concern_true_why,
            d.confidence_score
        FROM public.session_skin_concern_detection d
        JOIN public.skin_concern c
            ON c.concern_id = d.concern_id
        WHERE d.session_id = :session_id
          AND d.detection_source = :detection_source
        ORDER BY d.confidence_score DESC;
    """
    stmt = (
        select(
            SessionSkinConcernDetection.concern_id,
            SkinConcern.concern_name,
            SkinConcern.skin_concern_display_name,
            SessionSkinConcernDetection.if_skin_concern_true_why,
            SessionSkinConcernDetection.confidence_score,
            SessionSkinConcernDetection.skin_concern_exists,
        )
        .join(
            SkinConcern,
            SkinConcern.concern_id == SessionSkinConcernDetection.concern_id,
        )
        .where(
            SessionSkinConcernDetection.session_id == session_id,
            SessionSkinConcernDetection.detection_source == detection_source,
        )
        .order_by(
            desc(func.coalesce(SessionSkinConcernDetection.confidence_score, 0.0)),
            SessionSkinConcernDetection.concern_id.asc(),
        )
    )

    result = await db.execute(stmt)
    rows = result.all()

    detections: list[dict[str, Any]] = []
    for row in rows:
        score = float(row.confidence_score or 0.0)
        detections.append(
            {
                "concern_id": row.concern_id,
                "concern_name": row.concern_name,
                "skin_concern_display_name": row.skin_concern_display_name
                or row.concern_name,
                "if_skin_concern_true_why": row.if_skin_concern_true_why or "",
                "confidence_score": round(score, 4),
                "confidence_pct": round(score * 100),
                "skin_concern_exists": bool(row.skin_concern_exists),
            }
        )
    return detections


async def get_session_combined_concerns(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """Fetches combined OR-merged concerns from session_skin_concern joined with skin_concern."""
    stmt = (
        select(
            SessionSkinConcern.concern_id,
            SkinConcern.concern_name,
            SkinConcern.skin_concern_display_name,
            SessionSkinConcern.image_skin_concern_exists,
            SessionSkinConcern.questionnaire_skin_concern_exists,
            SessionSkinConcern.skin_concern_exists,
            SessionSkinConcern.if_skin_concern_true_why,
        )
        .join(SkinConcern, SkinConcern.concern_id == SessionSkinConcern.concern_id)
        .where(SessionSkinConcern.session_id == session_id)
        .order_by(
            desc(SessionSkinConcern.skin_concern_exists),
            SessionSkinConcern.concern_id.asc(),
        )
    )
    result = await db.execute(stmt)
    return [
        {
            "concern_id": row.concern_id,
            "concern_name": row.concern_name,
            "skin_concern_display_name": row.skin_concern_display_name or row.concern_name,
            "image_skin_concern_exists": bool(row.image_skin_concern_exists),
            "questionnaire_skin_concern_exists": bool(row.questionnaire_skin_concern_exists),
            "skin_concern_exists": bool(row.skin_concern_exists),
            "if_skin_concern_true_why": row.if_skin_concern_true_why or "",
        }
        for row in result.all()
    ]


async def get_session_questionnaire_answers(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """Extracts human-readable question/answer pairs from the latest QuestionnaireResponse."""
    stmt = (
        select(QuestionnaireResponse)
        .where(QuestionnaireResponse.session_id == session_id)
        .order_by(desc(QuestionnaireResponse.submitted_at))
        .limit(1)
    )
    result = await db.execute(stmt)
    qr = result.scalar_one_or_none()
    if qr is None or not isinstance(qr.response_json, dict):
        return []

    sections = qr.response_json.get("questionnaire", {}).get("sections", [])
    qa_list: list[dict[str, Any]] = []
    for section in sections:
        section_title = section.get("section_title", "")
        for q in section.get("questions", []):
            ans = q.get("user_response")
            if isinstance(ans, list):
                ans_str = ", ".join(str(x) for x in ans)
            else:
                ans_str = str(ans) if ans is not None else "—"

            cond = q.get("conditional_field")
            if isinstance(cond, dict) and cond.get("user_text_response"):
                ans_str += f" ({cond['user_text_response']})"

            qa_list.append(
                {
                    "section_title": section_title,
                    "question_id": q.get("question_id", ""),
                    "question_text": q.get("question_text", ""),
                    "answer": ans_str,
                }
            )
    return qa_list


async def get_session_recommendation_detail(
    db: AsyncSession,
    *,
    session_id: uuid.UUID,
) -> dict[str, Any] | None:
    """Fetches the finalized RecommendationOutput JSON for the session if available."""
    stmt = (
        select(RecommendationOutput.output_json)
        .join(
            RecommendationRun,
            RecommendationRun.recommendation_id == RecommendationOutput.recommendation_id,
        )
        .where(RecommendationRun.session_id == session_id)
        .order_by(desc(RecommendationRun.created_at))
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()