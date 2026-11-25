import json
import logging
from dataclasses import dataclass
from pathlib import Path

from google.genai import types
from pydantic import ValidationError

from app.core.config import get_settings
from app.schemas.visual_ai import VisualAIResponse
from app.services.genai_cascade import generate_with_cascade, resolve_model_cascade
from app.services.genai_schema import genai_response_schema
from app.services.visual_ai.system_prompt import VISUAL_AI_SYSTEM_PROMPT

logger = logging.getLogger("celrevive_backend.visual_ai")

TEMPLATE_PATH = Path(__file__).parent / "image_detection.json"


class VisualAIAPIError(Exception):
    """The Gemini API call itself failed (network, auth, rate limit, etc.)."""


class VisualAIMalformedResponseError(Exception):
    """The API responded, but the payload wasn't valid/parseable JSON matching our schema."""


@dataclass
class VisualAIAnalysisResult:
    """
    Bundles the untouched model output with the cleaned/validated result.
    raw is needed downstream (2.5) for session_skin_concern_detection.raw_detection_json —
    an audit trail of exactly what the model said before we dropped unsupported IDs,
    deduplicated, or cleared inconsistent explanations.
    """

    raw: dict
    validated: VisualAIResponse


def _load_template_json() -> str:
    return TEMPLATE_PATH.read_text(encoding="utf-8")


def call_visual_ai(image_bytes: bytes, mime_type: str) -> VisualAIAnalysisResult:
    template_json = _load_template_json()
    settings = get_settings()

    models = resolve_model_cascade(
        settings,
        primary_attr="VISUAL_AI_MODEL",
        fallback_attr="VISUAL_AI_FALLBACK_MODELS",
        error_cls=VisualAIAPIError,
    )

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                types.Part.from_text(
                    text=(
                        "Evaluate this image against the following template. "
                        "Return the same template with every field populated "
                        "per your instructions:\n\n" + template_json
                    )
                ),
            ],
        )
    ]
    config = types.GenerateContentConfig(
        system_instruction=VISUAL_AI_SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=genai_response_schema(VisualAIResponse),
        temperature=0.1,
    )

    response = generate_with_cascade(
        stage_name="Visual",
        api_key=settings.GEMINI_API_KEY,
        models=models,
        contents=contents,
        config=config,
        error_cls=VisualAIAPIError,
    )

    try:
        raw = json.loads(response.text)
    except (TypeError, json.JSONDecodeError) as exc:
        logger.error("Visual AI returned non-JSON response: %.500s", response.text)
        raise VisualAIMalformedResponseError("Response was not valid JSON") from exc

    try:
        validated = VisualAIResponse.model_validate(raw)
    except ValidationError as exc:
        logger.error("Visual AI response failed schema validation: %s", exc)
        raise VisualAIMalformedResponseError(str(exc)) from exc

    return VisualAIAnalysisResult(raw=raw, validated=validated)