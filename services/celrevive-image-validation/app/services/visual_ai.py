"""Asynchronous Visual AI trigger, strict response validation, and persistence."""

import json
import logging
from pathlib import Path
from urllib.parse import unquote, urlparse
from uuid import UUID

import httpx

from app.core.config import get_settings
from app.core.database import get_connection
from app.schemas.visual_ai import VisualAIResponse

logger = logging.getLogger("celrevive.visual_ai")


def _storage_uri_to_path(storage_uri: str) -> Path:
    parsed = urlparse(storage_uri)
    if parsed.scheme != "file":
        raise ValueError("Visual AI currently requires a file:// storage URI.")

    path = unquote(parsed.path)
    # file:///D:/... becomes /D:/... in a URI; strip only the URI separator.
    if len(path) >= 3 and path[0] == "/" and path[2] == ":":
        path = path[1:]
    return Path(path)


def _persist_visual_detection(
    *,
    session_id: UUID,
    image_id: UUID,
    response: VisualAIResponse,
    raw_json: dict,
) -> None:
    """Replace IMAGE detections for this image in one transaction."""
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM session_skin_concern_detection WHERE image_id = %s",
                (image_id,),
            )

            for concern in response.image_skin_concerns:
                cursor.execute(
                    """
                    INSERT INTO session_skin_concern_detection (
                        session_id,
                        concern_id,
                        detection_source,
                        image_id,
                        skin_concern_exists,
                        if_skin_concern_true_why,
                        raw_detection_json
                    )
                    VALUES (%s, %s, 'IMAGE', %s, %s, %s, %s::jsonb)
                    """,
                    (
                        session_id,
                        concern.skin_concern_id,
                        image_id,
                        concern.skin_concern_exists,
                        concern.if_skin_concern_true_why,
                        json.dumps(raw_json),
                    ),
                )


def trigger_visual_ai_analysis(
    *,
    session_id: UUID,
    image_id: UUID,
    storage_uri: str,
    mime_type: str,
) -> None:
    """Call the configured Visual AI service and persist its validated output.

    This function is intended to run as a FastAPI BackgroundTask, so image
    validation and the questionnaire redirect do not wait for Visual AI.
    """
    settings = get_settings()
    if not settings.VISUAL_AI_URL:
        logger.warning(
            "Visual AI trigger skipped: VISUAL_AI_URL is not configured "
            "session_id=%s image_id=%s",
            session_id,
            image_id,
        )
        return

    try:
        image_path = _storage_uri_to_path(storage_uri)
        if not image_path.exists():
            raise FileNotFoundError(f"Stored image does not exist: {storage_uri}")

        with image_path.open("rb") as image_file:
            response = httpx.post(
                settings.VISUAL_AI_URL,
                files={
                    "image": (
                        image_path.name,
                        image_file,
                        mime_type,
                    )
                },
                data={
                    "session_id": str(session_id),
                    "image_id": str(image_id),
                },
                timeout=settings.VISUAL_AI_TIMEOUT_SECONDS,
            )
        response.raise_for_status()

        raw_json = response.json()
        validated = VisualAIResponse.model_validate(raw_json)
        _persist_visual_detection(
            session_id=session_id,
            image_id=image_id,
            response=validated,
            raw_json=raw_json,
        )
        logger.info(
            "Visual AI detection persisted session_id=%s image_id=%s",
            session_id,
            image_id,
        )
    except Exception:
        logger.exception(
            "Visual AI analysis failed session_id=%s image_id=%s",
            session_id,
            image_id,
        )
