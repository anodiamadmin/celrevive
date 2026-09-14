import json
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest

from app.schemas.visual_ai import SUPPORTED_IMAGE_CONCERNS
from app.services.visual_ai.client import (
    VisualAIAPIError,
    VisualAIAnalysisResult,
    VisualAIMalformedResponseError,
    call_visual_ai,
)


def template_payload(*, detected_ids: set[str] | None = None) -> dict:
    detected_ids = detected_ids or set()
    return {
        "image_skin_concerns": [
            {
                "skin_concern_id": concern_id,
                "skin_concern_name": concern_id,
                "skin_concern_exists": concern_id in detected_ids,
                "if_skin_concern_true_why": (
                    f"Visible evidence for {concern_id}." if concern_id in detected_ids else ""
                ),
            }
            for concern_id in sorted(SUPPORTED_IMAGE_CONCERNS)
        ]
    }


def fake_settings():
    return SimpleNamespace(GEMINI_API_KEY="test-key", VISUAL_AI_MODEL="test-model")


@patch("app.services.visual_ai.client.get_settings", side_effect=fake_settings)
@patch("app.services.visual_ai.client.genai.Client")
def test_client_accepts_supported_multiple_detected_concerns(mock_client, _settings):
    payload = template_payload(detected_ids={"SC0005", "SC1003"})
    mock_client.return_value.models.generate_content.return_value.text = json.dumps(payload)

    result = call_visual_ai(b"image-bytes", "image/jpeg")

    assert isinstance(result, VisualAIAnalysisResult)
    assert {item.skin_concern_id for item in result.validated.detected_concerns} == {"SC0005", "SC1003"}
    assert result.raw == payload
    config = mock_client.return_value.models.generate_content.call_args.kwargs["config"]
    assert config.response_schema is not None


@patch("app.services.visual_ai.client.get_settings", side_effect=fake_settings)
@patch("app.services.visual_ai.client.genai.Client")
def test_client_returns_valid_no_concern_result(mock_client, _settings):
    payload = template_payload()
    mock_client.return_value.models.generate_content.return_value.text = json.dumps(payload)

    result = call_visual_ai(b"image-bytes", "image/jpeg")

    assert result.validated.has_no_visible_concerns is True
    assert len(result.validated.image_skin_concerns) == 28


@patch("app.services.visual_ai.client.get_settings", side_effect=fake_settings)
@patch("app.services.visual_ai.client.genai.Client")
def test_client_classifies_malformed_json_separately(mock_client, _settings):
    mock_client.return_value.models.generate_content.return_value.text = "not-json"

    with pytest.raises(VisualAIMalformedResponseError):
        call_visual_ai(b"image-bytes", "image/jpeg")


@patch("app.services.visual_ai.client.get_settings", side_effect=fake_settings)
@patch("app.services.visual_ai.client.genai.Client")
def test_client_classifies_api_failure_separately(mock_client, _settings):
    mock_client.return_value.models.generate_content.side_effect = TimeoutError("provider unavailable")

    with pytest.raises(VisualAIAPIError):
        call_visual_ai(b"image-bytes", "image/jpeg")


def test_client_rejects_missing_api_key_before_provider_call():
    with patch("app.services.visual_ai.client.get_settings", return_value=SimpleNamespace(GEMINI_API_KEY=None)):
        with pytest.raises(VisualAIAPIError, match="GEMINI_API_KEY"):
            call_visual_ai(b"image-bytes", "image/jpeg")
