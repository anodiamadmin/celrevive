import json
import logging
from typing import Any

from google.genai import types
from pydantic import ValidationError

from app.core.config import get_settings
from app.schemas.formulation import FormulationRecommendation
from app.services.formulation_ai.system_prompt import FORMULATION_AI_SYSTEM_PROMPT
from app.services.genai_cascade import generate_with_cascade, resolve_model_cascade
from app.services.genai_schema import genai_response_schema

logger = logging.getLogger("celrevive_backend.formulation_ai")


class FormulationAIError(Exception):
    """The formulation recommendation provider call failed."""


class FormulationMalformedResponseError(Exception):
    """The provider response was invalid or did not match the output contract."""


def call_formulation_ai(
    candidate_information: dict[str, Any],
) -> tuple[dict[str, Any], FormulationRecommendation]:
    settings = get_settings()

    models = resolve_model_cascade(
        settings,
        primary_attr="FORMULATION_AI_MODEL",
        fallback_attr="FORMULATION_AI_FALLBACK_MODELS",
        error_cls=FormulationAIError,
    )

    contents = [
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
    ]
    config = types.GenerateContentConfig(
        system_instruction=FORMULATION_AI_SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=genai_response_schema(FormulationRecommendation),
        temperature=0.1,
    )

    response = generate_with_cascade(
        stage_name="Formulation",
        api_key=settings.GEMINI_API_KEY,
        models=models,
        contents=contents,
        config=config,
        error_cls=FormulationAIError,
    )

    try:
        raw = json.loads(response.text)
        recommendation = FormulationRecommendation.model_validate(raw)
    except (TypeError, json.JSONDecodeError, ValidationError) as exc:
        logger.error("Formulation AI response failed schema validation: %s", exc)
        raise FormulationMalformedResponseError(str(exc)) from exc

    return raw, recommendation