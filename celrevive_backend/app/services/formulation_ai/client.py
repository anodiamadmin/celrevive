import json
import logging
from typing import Any

from google import genai
from google.genai import types
from pydantic import ValidationError

from app.core.config import get_settings
from app.schemas.formulation import FormulationRecommendation
from app.services.formulation_ai.system_prompt import FORMULATION_AI_SYSTEM_PROMPT

logger = logging.getLogger("celrevive_backend.formulation_ai")


class FormulationAIError(Exception):
    """The formulation recommendation provider call failed."""


class FormulationMalformedResponseError(Exception):
    """The provider response was invalid or did not match the output contract."""


def call_formulation_ai(
    candidate_information: dict[str, Any],
) -> tuple[dict[str, Any], FormulationRecommendation]:
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise FormulationAIError("GEMINI_API_KEY is not configured")

    try:
        response = genai.Client(api_key=settings.GEMINI_API_KEY).models.generate_content(
            model=settings.FORMULATION_AI_MODEL,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(
                            text=(
                                "Select a compatible recommendation using the "
                                "following candidate information:\n\n"
                                + json.dumps(candidate_information, ensure_ascii=False, default=str)
                            )
                        )
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=FORMULATION_AI_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=FormulationRecommendation,
                temperature=0.1,
            ),
        )
    except Exception as exc:
        logger.exception("Formulation AI API call failed")
        raise FormulationAIError(str(exc)) from exc

    try:
        raw = json.loads(response.text)
        recommendation = FormulationRecommendation.model_validate(raw)
    except (TypeError, json.JSONDecodeError, ValidationError) as exc:
        logger.error("Formulation AI response failed schema validation: %s", exc)
        raise FormulationMalformedResponseError(str(exc)) from exc
    return raw, recommendation
