import json
from uuid import uuid4

import pytest

from app.schemas.visual_ai import CONCERN_NAMES, VisualAIResponse
from app.services import visual_ai


class RecordingCursor:
    def __init__(self, *, fail_on_insert: bool = False):
        self.statements = []
        self.fail_on_insert = fail_on_insert

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def execute(self, query, params):
        self.statements.append((query, params))
        if self.fail_on_insert and "INSERT INTO session_skin_concern_detection" in query:
            raise RuntimeError("simulated database insert failure")


class RecordingConnection:
    def __init__(self, cursor: RecordingCursor):
        self.cursor_instance = cursor
        self.exit_args = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.exit_args = (exc_type, exc_value, traceback)
        return False

    def cursor(self):
        return self.cursor_instance


def _valid_response() -> VisualAIResponse:
    return VisualAIResponse.model_validate(
        {
            "image_skin_concerns": [
                {
                    "skin_concern_id": concern_id,
                    "skin_concern_name": concern_name,
                    "skin_concern_exists": concern_id in {"SC0008", "SC0013"},
                    "if_skin_concern_true_why": (
                        "Detected from the visual evidence."
                        if concern_id in {"SC0008", "SC0013"}
                        else ""
                    ),
                }
                for concern_id, concern_name in CONCERN_NAMES.items()
            ]
        }
    )


def test_persist_visual_detection_writes_one_image_row_per_concern(monkeypatch):
    cursor = RecordingCursor()
    connection = RecordingConnection(cursor)
    monkeypatch.setattr(visual_ai, "get_connection", lambda: connection)

    session_id = uuid4()
    image_id = uuid4()
    raw_json = {
        "image_skin_concerns": [
            {"skin_concern_id": "SC0008", "skin_concern_exists": True}
        ],
        "model_metadata": {"provider": "test", "version": "1"},
    }

    visual_ai._persist_visual_detection(
        session_id=session_id,
        image_id=image_id,
        response=_valid_response(),
        raw_json=raw_json,
    )

    assert len(cursor.statements) == 29
    assert cursor.statements[0][1] == (image_id,)

    insert_statements = [
        statement for statement in cursor.statements
        if "INSERT INTO session_skin_concern_detection" in statement[0]
    ]

    assert len(insert_statements) == 28
    assert all(params[0] == session_id for _, params in insert_statements)
    assert all(params[2] == image_id for _, params in insert_statements)
    assert all("'IMAGE'" in query for query, _ in insert_statements)

    by_concern = {params[1]: params for _, params in insert_statements}
    assert by_concern["SC0008"][3] is True
    assert by_concern["SC0008"][4] == "Detected from the visual evidence."
    assert json.loads(by_concern["SC0008"][5]) == raw_json


def test_persist_visual_detection_propagates_database_failure_for_transaction_rollback(monkeypatch):
    cursor = RecordingCursor(fail_on_insert=True)
    connection = RecordingConnection(cursor)
    monkeypatch.setattr(visual_ai, "get_connection", lambda: connection)

    with pytest.raises(RuntimeError, match="simulated database insert failure"):
        visual_ai._persist_visual_detection(
            session_id=uuid4(),
            image_id=uuid4(),
            response=_valid_response(),
            raw_json={"image_skin_concerns": []},
        )

    exc_type, exc_value, _ = connection.exit_args
    assert exc_type is RuntimeError
    assert str(exc_value) == "simulated database insert failure"


def test_repeat_visual_detection_replaces_prior_image_rows_before_inserting_current_set(monkeypatch):
    cursor = RecordingCursor()
    connection = RecordingConnection(cursor)
    monkeypatch.setattr(visual_ai, "get_connection", lambda: connection)

    session_id = uuid4()
    image_id = uuid4()
    response = _valid_response()

    visual_ai._persist_visual_detection(
        session_id=session_id,
        image_id=image_id,
        response=response,
        raw_json={"run": 1},
    )
    first_run_count = len(cursor.statements)

    visual_ai._persist_visual_detection(
        session_id=session_id,
        image_id=image_id,
        response=response,
        raw_json={"run": 2},
    )

    delete_statements = [
        (index, statement)
        for index, statement in enumerate(cursor.statements)
        if "DELETE FROM session_skin_concern_detection" in statement[0]
    ]
    assert len(delete_statements) == 2
    assert all(statement[1] == (image_id,) for _, statement in delete_statements)

    second_delete_index = delete_statements[1][0]
    second_run_inserts = cursor.statements[second_delete_index + 1:]
    assert len(second_run_inserts) == 28
    assert all("INSERT INTO session_skin_concern_detection" in query for query, _ in second_run_inserts)
    assert first_run_count == 29


def test_schema_invalid_visual_ai_response_does_not_persist(monkeypatch, tmp_path):
    class FakeSettings:
        VISUAL_AI_URL = "http://visual-ai.test/analyze"
        VISUAL_AI_TIMEOUT_SECONDS = 5

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            payload = _valid_response().model_dump()
            payload["image_skin_concerns"][0]["skin_concern_id"] = "SC0020"
            return payload

    persisted = False

    def fail_if_called(**_kwargs):
        nonlocal persisted
        persisted = True

    image_path = tmp_path / "skin.jpg"
    image_path.write_bytes(b"test-image")

    monkeypatch.setattr(visual_ai, "get_settings", lambda: FakeSettings())
    monkeypatch.setattr(visual_ai, "_storage_uri_to_path", lambda _uri: image_path)
    monkeypatch.setattr(visual_ai.httpx, "post", lambda *args, **kwargs: FakeResponse())
    monkeypatch.setattr(visual_ai, "_persist_visual_detection", fail_if_called)

    visual_ai.trigger_visual_ai_analysis(
        session_id=uuid4(),
        image_id=uuid4(),
        storage_uri="file:///test/skin.jpg",
        mime_type="image/jpeg",
    )

    assert persisted is False
