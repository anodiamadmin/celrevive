from pathlib import PureWindowsPath
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.visual_ai import CONCERN_NAMES, VisualAIResponse
from app.services import visual_ai
from app.services.visual_ai import _storage_uri_to_path


def _valid_payload() -> dict:
    return {
        "image_skin_concerns": [
            {
                "skin_concern_id": concern_id,
                "skin_concern_name": concern_name,
                "skin_concern_exists": False,
                "if_skin_concern_true_why": "",
            }
            for concern_id, concern_name in CONCERN_NAMES.items()
        ]
    }


def test_visual_ai_schema_accepts_exact_image_detection_contract():
    response = VisualAIResponse.model_validate(_valid_payload())

    assert len(response.image_skin_concerns) == 28
    assert {item.skin_concern_id for item in response.image_skin_concerns} == set(CONCERN_NAMES)


def test_visual_ai_schema_rejects_unknown_concern_id():
    payload = _valid_payload()
    payload["image_skin_concerns"][0]["skin_concern_id"] = "SC9999"

    with pytest.raises(ValidationError):
        VisualAIResponse.model_validate(payload)


def test_visual_ai_schema_rejects_missing_concern():
    payload = _valid_payload()
    payload["image_skin_concerns"] = payload["image_skin_concerns"][:-1]

    with pytest.raises(ValidationError):
        VisualAIResponse.model_validate(payload)


def test_visual_ai_schema_rejects_extra_fields():
    payload = _valid_payload()
    payload["unexpected"] = True

    with pytest.raises(ValidationError):
        VisualAIResponse.model_validate(payload)


def test_visual_ai_schema_requires_explanation_for_positive_detection():
    payload = _valid_payload()
    payload["image_skin_concerns"][0]["skin_concern_exists"] = True

    with pytest.raises(ValidationError):
        VisualAIResponse.model_validate(payload)


def test_visual_ai_trigger_persists_only_after_successful_schema_validation(monkeypatch, tmp_path):
    class FakeSettings:
        VISUAL_AI_URL = "http://visual-ai.test/analyze"
        VISUAL_AI_TIMEOUT_SECONDS = 5

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "image_skin_concerns": [
                    item.model_dump()
                    for item in VisualAIResponse.model_validate(_valid_payload()).image_skin_concerns
                ]
            }

    image_path = tmp_path / "skin.jpg"
    image_path.write_bytes(b"test-image")
    persisted = {}

    monkeypatch.setattr(visual_ai, "get_settings", lambda: FakeSettings())
    monkeypatch.setattr(visual_ai, "_storage_uri_to_path", lambda _uri: image_path)
    monkeypatch.setattr(visual_ai.httpx, "post", lambda *args, **kwargs: FakeResponse())
    monkeypatch.setattr(
        visual_ai,
        "_persist_visual_detection",
        lambda **kwargs: persisted.update(kwargs),
    )

    session_id = uuid4()
    image_id = uuid4()
    visual_ai.trigger_visual_ai_analysis(
        session_id=session_id,
        image_id=image_id,
        storage_uri="file:///test/skin.jpg",
        mime_type="image/jpeg",
    )

    assert persisted["session_id"] == session_id
    assert persisted["image_id"] == image_id
    assert isinstance(persisted["response"], VisualAIResponse)


def test_visual_ai_trigger_handles_missing_stored_image_without_persisting(monkeypatch, tmp_path):
    class FakeSettings:
        VISUAL_AI_URL = "http://visual-ai.test/analyze"
        VISUAL_AI_TIMEOUT_SECONDS = 5

    persisted = False

    monkeypatch.setattr(visual_ai, "get_settings", lambda: FakeSettings())
    monkeypatch.setattr(visual_ai, "_storage_uri_to_path", lambda _uri: tmp_path / "missing.jpg")
    monkeypatch.setattr(
        visual_ai,
        "_persist_visual_detection",
        lambda **kwargs: (_ for _ in ()).throw(AssertionError("must not persist")),
    )

    visual_ai.trigger_visual_ai_analysis(
        session_id=uuid4(),
        image_id=uuid4(),
        storage_uri="file:///test/missing.jpg",
        mime_type="image/jpeg",
    )

    assert persisted is False


def test_visual_ai_trigger_handles_http_failure_without_persisting(monkeypatch, tmp_path):
    class FakeSettings:
        VISUAL_AI_URL = "http://visual-ai.test/analyze"
        VISUAL_AI_TIMEOUT_SECONDS = 5

    class FakeResponse:
        def raise_for_status(self):
            raise RuntimeError("visual ai unavailable")

    image_path = tmp_path / "skin.jpg"
    image_path.write_bytes(b"test-image")

    monkeypatch.setattr(visual_ai, "get_settings", lambda: FakeSettings())
    monkeypatch.setattr(visual_ai, "_storage_uri_to_path", lambda _uri: image_path)
    monkeypatch.setattr(visual_ai.httpx, "post", lambda *args, **kwargs: FakeResponse())
    monkeypatch.setattr(
        visual_ai,
        "_persist_visual_detection",
        lambda **kwargs: (_ for _ in ()).throw(AssertionError("must not persist")),
    )

    visual_ai.trigger_visual_ai_analysis(
        session_id=uuid4(),
        image_id=uuid4(),
        storage_uri="file:///test/skin.jpg",
        mime_type="image/jpeg",
    )


def test_windows_file_uri_round_trips_to_absolute_path():
    path = _storage_uri_to_path("file:///D:/celrevive/data/skin.jpg")

    assert PureWindowsPath(path) == PureWindowsPath("D:/celrevive/data/skin.jpg")
