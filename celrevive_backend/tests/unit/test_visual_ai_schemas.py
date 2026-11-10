import json

import pytest
from pydantic import ValidationError

from app.schemas.visual_ai import SUPPORTED_IMAGE_CONCERNS, VisualAIResponse
from app.services.questionnaire_ai.client import DETECTION_TEMPLATE_PATH


def make_template_payload() -> dict:
    return {
        "image_skin_concerns": [
            {
                "skin_concern_id": concern_id,
                "skin_concern_name": concern_id,
                "skin_concern_exists": False,
                "confidence_score": 0.0,
                "if_skin_concern_true_why": "",
            }
            for concern_id in sorted(SUPPORTED_IMAGE_CONCERNS)
        ]
    }


def test_complete_template_is_accepted():
    payload = make_template_payload()
    payload["image_skin_concerns"][0]["skin_concern_exists"] = True
    payload["image_skin_concerns"][0]["confidence_score"] = 0.8
    payload["image_skin_concerns"][0]["if_skin_concern_true_why"] = "Visible evidence."

    response = VisualAIResponse.model_validate(payload)

    assert len(response.image_skin_concerns) == 28


def test_image_and_questionnaire_detection_scopes_match_the_detectability_matrix():
    questionnaire_template = json.loads(
        DETECTION_TEMPLATE_PATH.read_text(encoding="utf-8")
    )
    questionnaire_ids = {
        item["skin_concern_id"]
        for item in questionnaire_template["questionnaire_skin_concerns"]
    }

    assert SUPPORTED_IMAGE_CONCERNS == (
        {f"SC{number:04d}" for number in range(1, 20)}
        | {f"SC{number:04d}" for number in range(1001, 1010)}
    )
    assert questionnaire_ids == (
        {f"SC{number:04d}" for number in range(1, 20)}
        | {f"SC{number:04d}" for number in range(2001, 2005)}
    )
    assert SUPPORTED_IMAGE_CONCERNS & questionnaire_ids == {
        f"SC{number:04d}" for number in range(1, 20)
    }


def test_image_detection_rejects_questionnaire_only_ids():
    payload = make_template_payload()
    payload["image_skin_concerns"].append(
        {
            "skin_concern_id": "SC2001",
            "skin_concern_name": "Questionnaire-only",
            "skin_concern_exists": False,
            "confidence_score": 0.0,
            "if_skin_concern_true_why": "",
        }
    )

    with pytest.raises(ValidationError, match="not detectable from images"):
        VisualAIResponse.model_validate(payload)


def test_image_detection_rejects_duplicate_ids():
    payload = make_template_payload()
    payload["image_skin_concerns"].append(payload["image_skin_concerns"][0].copy())

    with pytest.raises(ValidationError, match="duplicate concern ID"):
        VisualAIResponse.model_validate(payload)


def test_incomplete_template_raises_validation_error():
    payload = make_template_payload()
    payload["image_skin_concerns"] = payload["image_skin_concerns"][:-1]

    with pytest.raises(ValidationError, match="missing 1 required image concern"):
        VisualAIResponse.model_validate(payload)


def test_false_concern_explanation_is_cleared():
    payload = make_template_payload()
    payload["image_skin_concerns"][0]["if_skin_concern_true_why"] = "Should be cleared."

    response = VisualAIResponse.model_validate(payload)

    assert response.image_skin_concerns[0].if_skin_concern_true_why == ""


@pytest.mark.parametrize("confidence_score", [-0.01, 1.01])
def test_confidence_score_must_be_between_zero_and_one(confidence_score):
    payload = make_template_payload()
    payload["image_skin_concerns"][0]["confidence_score"] = confidence_score

    with pytest.raises(ValidationError, match="confidence_score"):
        VisualAIResponse.model_validate(payload)


def test_detected_concerns_use_strict_threshold_and_return_top_five():
    payload = make_template_payload()
    concerns = payload["image_skin_concerns"]
    scores = [0.51, 0.99, 0.8, 0.7, 0.6, 0.55, 0.5]
    for concern, score in zip(concerns, scores, strict=False):
        concern["skin_concern_exists"] = True
        concern["confidence_score"] = score
        concern["if_skin_concern_true_why"] = "Visible evidence."

    concerns[7]["skin_concern_exists"] = False
    concerns[7]["confidence_score"] = 0.95
    response = VisualAIResponse.model_validate(payload)

    assert [concern.confidence_score for concern in response.detected_concerns] == [
        0.99,
        0.8,
        0.7,
        0.6,
        0.55,
    ]
    assert len(response.detected_concerns) == 5


def test_detected_concerns_can_be_fewer_than_five():
    payload = make_template_payload()
    payload["image_skin_concerns"][0].update(
        skin_concern_exists=True,
        confidence_score=0.5001,
        if_skin_concern_true_why="Visible evidence.",
    )

    response = VisualAIResponse.model_validate(payload)

    assert [concern.skin_concern_id for concern in response.detected_concerns] == [
        payload["image_skin_concerns"][0]["skin_concern_id"]
    ]
