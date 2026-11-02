from types import SimpleNamespace

import pytest

from app.repositories.recommendation_repository import merge_concern_detections


def detection(
    concern_id: str,
    source: str,
    exists: bool,
    explanation: str = "",
) -> SimpleNamespace:
    return SimpleNamespace(
        concern_id=concern_id,
        detection_source=source,
        skin_concern_exists=exists,
        if_skin_concern_true_why=explanation,
    )


def test_merge_uses_or_and_keeps_source_explanations():
    result = merge_concern_detections(
        [
            detection("SC0001", "IMAGE", True, "Visible dry patches."),
            detection("SC0001", "QUESTIONNAIRE", True, "Dryness was self-reported."),
            detection("SC0002", "IMAGE", True, "Visible dehydration signs."),
            detection("SC0003", "QUESTIONNAIRE", True, "Irritation was self-reported."),
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
    assert by_id["SC0002"]["image_skin_concern_exists"] is True
    assert by_id["SC0002"]["questionnaire_skin_concern_exists"] is False
    assert by_id["SC0003"]["image_skin_concern_exists"] is False
    assert by_id["SC0003"]["questionnaire_skin_concern_exists"] is True
    assert by_id["SC0004"]["skin_concern_exists"] is False
    assert by_id["SC0004"]["if_skin_concern_true_why"] == ""


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
