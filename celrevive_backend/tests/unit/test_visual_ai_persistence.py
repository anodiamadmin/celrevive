import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.repositories.skin_concern_detection_repository import store_visual_ai_detections
from app.schemas.visual_ai import ImageSkinConcern, SUPPORTED_IMAGE_CONCERNS, VisualAIResponse
from app.services.visual_ai.client import VisualAIAnalysisResult
from app.workers.visual_ai_task import run_visual_ai_analysis


class FakeResult:
    def __init__(self, session_id):
        self.session_id = session_id

    def scalar_one_or_none(self):
        return self.session_id


class FakeDatabase:
    def __init__(self, session_id):
        self.session_id = session_id
        self.executed = []
        self.rows = []
        self.commit_count = 0

    async def execute(self, statement):
        self.executed.append(statement)
        if "SELECT" in str(statement).upper():
            return FakeResult(self.session_id)
        self.rows.clear()
        return FakeResult(self.session_id)

    def add_all(self, rows):
        self.rows.extend(rows)

    async def commit(self):
        self.commit_count += 1


def detections():
    return [
        ImageSkinConcern(
            skin_concern_id=concern_id,
            skin_concern_name=concern_id,
            skin_concern_exists=False,
            if_skin_concern_true_why="",
        )
        for concern_id in sorted(SUPPORTED_IMAGE_CONCERNS)
    ]


@pytest.mark.asyncio
async def test_store_persists_all_28_rows_with_image_reference():
    session_id = uuid.uuid4()
    image_id = uuid.uuid4()
    raw = {"image_skin_concerns": [{"unsupported": True}]}
    db = FakeDatabase(session_id)

    await store_visual_ai_detections(
        db,
        session_id=session_id,
        image_id=image_id,
        detections=detections(),
        raw_response_json=raw,
    )

    assert len(db.rows) == 28
    assert db.commit_count == 1
    assert all(row.detection_source == "IMAGE" for row in db.rows)
    assert all(row.image_id == image_id for row in db.rows)
    assert all(row.questionnaire_response_id is None for row in db.rows)
    assert all(row.raw_detection_json is raw for row in db.rows)

    await store_visual_ai_detections(
        db,
        session_id=session_id,
        image_id=image_id,
        detections=detections(),
        raw_response_json=raw,
    )

    assert len(db.rows) == 28
    assert db.commit_count == 2
    assert len(db.executed) == 4


@pytest.mark.asyncio
async def test_store_rejects_image_from_another_session():
    db = FakeDatabase(uuid.uuid4())

    with pytest.raises(ValueError, match="does not belong"):
        await store_visual_ai_detections(
            db,
            session_id=uuid.uuid4(),
            image_id=uuid.uuid4(),
            detections=detections(),
            raw_response_json={},
        )

    assert db.commit_count == 0


class FakeSessionContext:
    def __init__(self, db):
        self.db = db

    async def __aenter__(self):
        return self.db

    async def __aexit__(self, exc_type, exc_value, traceback):
        return False


@pytest.mark.asyncio
async def test_worker_opens_own_session_and_persists_validated_result():
    image_id = uuid.uuid4()
    session_id = uuid.uuid4()
    db = FakeDatabase(session_id)
    validated = VisualAIResponse(image_skin_concerns=[item.model_dump() for item in detections()])
    result = VisualAIAnalysisResult(raw={"original": True}, validated=validated)

    with patch("app.workers.visual_ai_task.AsyncSessionLocal", return_value=FakeSessionContext(db)), \
        patch(
            "app.workers.visual_ai_task.get_image_bytes_and_mime",
            new=AsyncMock(return_value=(b"bytes", "image/jpeg")),
        ), \
        patch("app.workers.visual_ai_task.call_visual_ai", return_value=result) as call_visual_ai_mock:
        await run_visual_ai_analysis(image_id, session_id)

    call_visual_ai_mock.assert_called_once_with(b"bytes", "image/jpeg")
    assert len(db.rows) == 28
    assert db.commit_count == 1
