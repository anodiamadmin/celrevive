import pytest
from pydantic import ValidationError
from app.schemas.visual_ai import VisualAIResponse


def test_valid_ai_response_is_accepted():
    """Valid IDs (e.g., SC0001, SC1001) should be parsed without issue."""
    payload = {
        "image_skin_concerns": [
            {
                "skin_concern_id": "SC0001",
                "skin_concern_name": "Dry Skin",
                "skin_concern_exists": True,
                "if_skin_concern_true_why": "Visible flaking on cheeks."
            }
        ]
    }

    response = VisualAIResponse(**payload)
    assert len(response.image_skin_concerns) == 1
    assert response.image_skin_concerns[0].skin_concern_id == "SC0001"


def test_duplicate_concern_ids_are_deduplicated():
    """If the AI hallucinates the same ID twice, the second instance should be dropped."""
    payload = {
        "image_skin_concerns": [
            {
                "skin_concern_id": "SC0008",
                "skin_concern_name": "Acne",
                "skin_concern_exists": True,
                "if_skin_concern_true_why": "First instance."
            },
            {
                "skin_concern_id": "SC0008",
                "skin_concern_name": "Acne",
                "skin_concern_exists": False,
                "if_skin_concern_true_why": "Duplicate instance."
            }
        ]
    }

    response = VisualAIResponse(**payload)
    assert len(response.image_skin_concerns) == 1
    # Should keep the first instance
    assert response.image_skin_concerns[0].if_skin_concern_true_why == "First instance."


def test_unsupported_ids_are_filtered_out():
    """IDs that are questionnaire-only (e.g., SC2001) or completely invalid should be dropped."""
    payload = {
        "image_skin_concerns": [
            {
                "skin_concern_id": "SC0005",
                "skin_concern_name": "Redness",
                "skin_concern_exists": True,
                "if_skin_concern_true_why": "Valid visual concern."
            },
            {
                "skin_concern_id": "SC2001",
                "skin_concern_name": "Itching / Irritation",
                "skin_concern_exists": True,
                "if_skin_concern_true_why": "Questionnaire-only concern."
            },
            {
                "skin_concern_id": "INVALID_ID",
                "skin_concern_name": "Nonsense",
                "skin_concern_exists": True,
                "if_skin_concern_true_why": "Hallucination."
            }
        ]
    }

    response = VisualAIResponse(**payload)
    assert len(response.image_skin_concerns) == 1
    assert response.image_skin_concerns[0].skin_concern_id == "SC0005"


def test_malformed_payload_raises_validation_error():
    """Missing required fields should trigger a strict Pydantic ValidationError."""
    payload = {
        "image_skin_concerns": [
            {
                "skin_concern_id": "SC0001"
                # Missing all other required fields
            }
        ]
    }

    with pytest.raises(ValidationError):
        VisualAIResponse(**payload)