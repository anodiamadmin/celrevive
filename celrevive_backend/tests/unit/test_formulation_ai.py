import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.schemas.formulation import FormulationRecommendation
from app.services.formulation_ai.client import (
    FormulationMalformedResponseError,
    call_formulation_ai,
)


def valid_output() -> dict:
    return {
        "base_id": 1,
        "if_base_selected_why": "The texture aligns with the questionnaire preference.",
        "actives": [
            {
                "active_id": 7,
                "if_active_selected_why": "It has positive relevance to the detected concern.",
            }
        ],
        "overall_explanation": "The selected active addresses the detected concern.",
        "safety_notice": "",
    }


@patch(
    "app.services.formulation_ai.client.get_settings",
    return_value=SimpleNamespace(
        GEMINI_API_KEY="test-key",
        FORMULATION_AI_MODEL="test-model",
    ),
)
@patch("app.services.formulation_ai.client.genai.Client")
def test_formulation_ai_returns_structured_recommendation(mock_client, _settings):
    payload = valid_output()
    mock_client.return_value.models.generate_content.return_value.text = json.dumps(payload)

    raw, recommendation = call_formulation_ai({"candidate_bases": [{"base_id": 1}]})

    assert raw == payload
    assert isinstance(recommendation, FormulationRecommendation)
    assert recommendation.base_id == 1
    config = mock_client.return_value.models.generate_content.call_args.kwargs["config"]
    assert config.response_schema is not None


@patch(
    "app.services.formulation_ai.client.get_settings",
    return_value=SimpleNamespace(
        GEMINI_API_KEY="test-key",
        FORMULATION_AI_MODEL="test-model",
    ),
)
@patch("app.services.formulation_ai.client.genai.Client")
def test_formulation_ai_rejects_malformed_response(mock_client, _settings):
    mock_client.return_value.models.generate_content.return_value.text = (
        '{"base_id": "not-an-integer"}'
    )

    with pytest.raises(FormulationMalformedResponseError):
        call_formulation_ai({"candidate_bases": [{"base_id": 1}]})
