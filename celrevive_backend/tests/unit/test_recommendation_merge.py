import json
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.repositories.recommendation_repository import (
    get_combined_skin_concerns,
    merge_concern_detections,
    select_recommendation_concerns,
    store_questionnaire_detections,
)
from app.schemas.questionnaire import QuestionnaireAnalysis
from app.services.questionnaire_ai.client import DETECTION_TEMPLATE_PATH


def detection(
    concern_id: str,
    source: str,
    exists: bool,
    explanation: str = "",
    confidence_score: float | None = 0.0,
) -> SimpleNamespace:
    return SimpleNamespace(
        concern_id=concern_id,
        detection_source=source,
        skin_concern_exists=exists,
        if_skin_concern_true_why=explanation,
        confidence_score=confidence_score,
    )


def test_merge_uses_or_and_keeps_source_explanations():
    result = merge_concern_detections(
        [
            detection("SC0001", "IMAGE", True, "Visible dry patches.", 0.75),
            detection(
                "SC0001",
                "QUESTIONNAIRE",
                True,
                "Dryness was self-reported.",
                0.9,
            ),
            detection("SC0002", "IMAGE", True, "Visible dehydration signs.", 0.8),
            detection(
                "SC0003",
                "QUESTIONNAIRE",
                True,
                "Irritation was self-reported.",
                0.7,
            ),
            detection("SC0004", "IMAGE", False, "must be cleared"),
            detection("SC0004", "QUESTIONNAIRE", False),
        ],
        {
            "SC0001": "Dry Skin",
            "SC0002": "Dehydrated Skin",
            "SC0003": "Compromised Skin Barrier",
            "SC0004": "Sensitive Skin",
        },
    )

    by_id = {item["skin_concern_id"]: item for item in result}
    assert by_id["SC0001"]["skin_concern_exists"] is True
    assert by_id["SC0001"]["if_skin_concern_true_why"] == (
        "Image: Visible dry patches. Questionnaire: Dryness was self-reported."
    )
    assert by_id["SC0001"]["confidence_score"] == 0.9
    assert by_id["SC0002"]["confidence_score"] == 0.8
    assert by_id["SC0003"]["confidence_score"] == 0.7
    assert by_id["SC0002"]["image_skin_concern_exists"] is True
    assert by_id["SC0002"]["questionnaire_skin_concern_exists"] is False
    assert by_id["SC0003"]["image_skin_concern_exists"] is False
    assert by_id["SC0003"]["questionnaire_skin_concern_exists"] is True
    assert by_id["SC0004"]["skin_concern_exists"] is False
    assert by_id["SC0004"]["if_skin_concern_true_why"] == ""


def test_recommendation_concern_selection_returns_confidence_ranked_top_five():
    concerns = [
        {
            "skin_concern_id": f"SC{number:04d}",
            "skin_concern_exists": True,
            "confidence_score": score,
        }
        for number, score in enumerate(
            [0.61, 0.96, 0.77, 0.88, 0.69, 0.99, 0.5],
            start=1,
        )
    ]
    concerns.append(
        {
            "skin_concern_id": "SC0010",
            "skin_concern_exists": False,
            "confidence_score": 1.0,
        }
    )

    selected = select_recommendation_concerns(concerns)

    assert [item["skin_concern_id"] for item in selected] == [
        "SC0006",
        "SC0002",
        "SC0004",
        "SC0003",
        "SC0005",
    ]
    assert len(selected) == 5


def test_recommendation_concern_selection_breaks_ties_by_concern_id():
    selected = select_recommendation_concerns(
        [
            {
                "skin_concern_id": "SC0002",
                "skin_concern_exists": True,
                "confidence_score": 0.8,
            },
            {
                "skin_concern_id": "SC0001",
                "skin_concern_exists": True,
                "confidence_score": 0.8,
            },
        ]
    )

    assert [item["skin_concern_id"] for item in selected] == ["SC0001", "SC0002"]


def test_merge_rejects_duplicate_source_for_a_concern():
    with pytest.raises(ValueError, match="Multiple image detections"):
        merge_concern_detections(
            [
                detection("SC0001", "IMAGE", True, "First result."),
                detection("SC0001", "IMAGE", False),
            ],
            {"SC0001": "Dry Skin"},
        )


def test_merge_rejects_a_missing_master_concern_name():
    with pytest.raises(ValueError, match="missing from the master catalog"):
        merge_concern_detections(
            [detection("SC0001", "IMAGE", False)],
            {},
        )


def questionnaire_analysis() -> QuestionnaireAnalysis:
    template = json.loads(DETECTION_TEMPLATE_PATH.read_text(encoding="utf-8"))
    return QuestionnaireAnalysis(
        skin_type="unknown",
        sensitivity_level="unknown",
        questionnaire_skin_concerns=[
            {
                **item,
                "confidence_score": 0.0,
            }
            for item in template["questionnaire_skin_concerns"]
        ],
    )


def questionnaire_storage_db(session_id: uuid.UUID):
    response_result = Mock()
    response_result.scalar_one_or_none.return_value = object()
    catalog_result = Mock()
    catalog_result.scalars.return_value.all.return_value = [
        SimpleNamespace(
            concern_id=f"SC{number:04d}",
            detectable_by_questionnaire=number < 1000 or number >= 2001,
        )
        for number in (
            list(range(1, 20))
            + list(range(1001, 1010))
            + list(range(2001, 2005))
        )
    ]
    db = Mock()
    db.execute = AsyncMock(side_effect=[response_result, catalog_result, Mock()])
    db.add_all = Mock()
    db.commit = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_questionnaire_storage_persists_only_questionnaire_detectable_ids():
    session_id = uuid.uuid4()
    response_id = uuid.uuid4()
    db = questionnaire_storage_db(session_id)

    await store_questionnaire_detections(
        db,
        session_id=session_id,
        questionnaire_response_id=response_id,
        detections=questionnaire_analysis(),
        raw_response_json={},
    )

    rows = list(db.add_all.call_args.args[0])
    assert len(rows) == 23
    assert {row.concern_id for row in rows} == {
        f"SC{number:04d}" for number in list(range(1, 20)) + list(range(2001, 2005))
    }
    assert all(row.detection_source == "QUESTIONNAIRE" for row in rows)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_questionnaire_storage_rejects_image_only_ids():
    session_id = uuid.uuid4()
    response_id = uuid.uuid4()
    db = questionnaire_storage_db(session_id)
    analysis = questionnaire_analysis()
    analysis.questionnaire_skin_concerns[-1].skin_concern_id = "SC1001"

    with pytest.raises(ValueError, match="not enabled for questionnaire detection"):
        await store_questionnaire_detections(
            db,
            session_id=session_id,
            questionnaire_response_id=response_id,
            detections=analysis,
            raw_response_json={},
        )

    db.add_all.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_combined_concern_lookup_returns_both_detection_sources():
    session_id = uuid.uuid4()
    concern = SimpleNamespace(
        concern_id="SC0001",
        image_skin_concern_exists=True,
        questionnaire_skin_concern_exists=True,
        skin_concern_exists=True,
        if_skin_concern_true_why="Image: Visible dryness. Questionnaire: Dryness reported.",
    )
    result = Mock()
    result.all.return_value = [(concern, "Dry Skin")]
    db = Mock(execute=AsyncMock(return_value=result))

    combined = await get_combined_skin_concerns(db, session_id=session_id)

    assert combined is not None
    assert combined[0].model_dump() == {
        "skin_concern_id": "SC0001",
        "skin_concern_name": "Dry Skin",
        "image_skin_concern_exists": True,
        "questionnaire_skin_concern_exists": True,
        "skin_concern_exists": True,
        "if_skin_concern_true_why": (
            "Image: Visible dryness. Questionnaire: Dryness reported."
        ),
    }


@pytest.mark.asyncio
async def test_combined_concern_lookup_returns_none_before_merge():
    result = Mock()
    result.all.return_value = []
    db = Mock(execute=AsyncMock(return_value=result))

    assert await get_combined_skin_concerns(
        db,
        session_id=uuid.uuid4(),
    ) is None
