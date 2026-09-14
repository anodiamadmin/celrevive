import pytest
from pydantic import ValidationError

from app.schemas.visual_ai import SUPPORTED_IMAGE_CONCERNS, VisualAIResponse


def make_template_payload() -> dict:
    return {
        "image_skin_concerns": [
            {
                "skin_concern_id": concern_id,
                "skin_concern_name": concern_id,
                "skin_concern_exists": False,
                "if_skin_concern_true_why": "",
            }
            for concern_id in sorted(SUPPORTED_IMAGE_CONCERNS)
        ]
    }


def test_complete_template_is_accepted():
    payload = make_template_payload()
    payload["image_skin_concerns"][0]["skin_concern_exists"] = True
    payload["image_skin_concerns"][0]["if_skin_concern_true_why"] = "Visible evidence."

    response = VisualAIResponse.model_validate(payload)

    assert len(response.image_skin_concerns) == 28


def test_duplicate_and_unsupported_ids_are_filtered_before_coverage_check():
    payload = make_template_payload()
    payload["image_skin_concerns"].append(payload["image_skin_concerns"][0].copy())
    payload["image_skin_concerns"].append(
        {
            "skin_concern_id": "SC2001",
            "skin_concern_name": "Questionnaire-only",
            "skin_concern_exists": False,
            "if_skin_concern_true_why": "",
        }
    )

    response = VisualAIResponse.model_validate(payload)

    assert len(response.image_skin_concerns) == 28
    assert len({item.skin_concern_id for item in response.image_skin_concerns}) == 28


def test_incomplete_template_raises_validation_error():
    payload = make_template_payload()
    payload["image_skin_concerns"] = payload["image_skin_concerns"][:-1]

    with pytest.raises(ValidationError, match="missing 1 required concern"):
        VisualAIResponse.model_validate(payload)


def test_false_concern_explanation_is_cleared():
    payload = make_template_payload()
    payload["image_skin_concerns"][0]["if_skin_concern_true_why"] = "Should be cleared."

    response = VisualAIResponse.model_validate(payload)

    assert response.image_skin_concerns[0].if_skin_concern_true_why == ""
