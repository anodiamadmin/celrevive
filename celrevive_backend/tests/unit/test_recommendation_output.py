import uuid

import pytest

from app.repositories.recommendation_repository import build_recommendation_output
from app.schemas.formulation import FormulationRecommendation, RecommendedActive


@pytest.mark.parametrize(
    ("base_name", "expected_weight"),
    [("Oil", 50), ("Serum", 50), ("Cream", 100)],
)
def test_recommendation_output_formats_widget_fields(base_name, expected_weight):
    session_id = uuid.uuid4()
    recommendation_id = uuid.uuid4()
    candidate_information = {
        "questionnaire_user_answer": {
            "questionnaire": {
                "sections": [
                    {
                        "questions": [
                            {"question_id": "q1", "user_response": "Dry"},
                        ]
                    }
                ]
            }
        },
        "combined_skin_concerns": [
            {
                "skin_concern_id": "SC0001",
                "skin_concern_name": "Dry Skin",
                "image_skin_concern_exists": False,
                "questionnaire_skin_concern_exists": True,
                "skin_concern_exists": True,
                "confidence_score": 0.87,
                "if_skin_concern_true_why": "Dryness was self-reported.",
            }
        ],
        "candidate_bases": [{"base_id": 1, "base_name": base_name}],
        "candidate_actives": [
            {
                "active_id": 7,
                "active_name": "Active A",
                "usage_level_min": 1.0,
                "usage_level_max": 4.0,
            }
        ],
    }
    recommendation = FormulationRecommendation(
        base_id=1,
        if_base_selected_why="Matches the stated preference.",
        actives=[
            RecommendedActive(
                active_id=7,
                if_active_selected_why="Supports the detected concern.",
            )
        ],
        overall_explanation="The selected formulation supports dry skin.",
    )

    output = build_recommendation_output(
        recommendation_id=recommendation_id,
        session_id=session_id,
        user_full_name="Jane Customer",
        candidate_information=candidate_information,
        recommendation=recommendation,
    )

    assert output["session_id"] == str(session_id)
    assert output["recommendation_id"] == str(recommendation_id)
    assert output["user_full_name"] == "Jane Customer"
    assert output["skin_type"] == "dry"
    assert output["skin_concerns"] == candidate_information["combined_skin_concerns"]
    assert output["skin_concerns"][0]["confidence_score"] == 0.87
    assert output["recommended_actives"][0]["recommended_usage_percentage"] == 1.0
    assert output["formulation_weight_g"] == expected_weight
    assert output["overall_explanation"] == recommendation.overall_explanation
