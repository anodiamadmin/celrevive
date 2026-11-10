import pytest

from app.repositories.recommendation_repository import validate_recommendation_selection
from app.schemas.formulation import FormulationRecommendation, RecommendedActive


def candidate_information(*, detected: bool = True) -> dict:
    return {
        "combined_skin_concerns": (
            [{"skin_concern_id": "SC0001"}] if detected else []
        ),
        "candidate_bases": [{"base_id": 1, "base_name": "Cream"}],
        "candidate_actives": [{"active_id": 7, "active_name": "Active A"}],
        "compatible_base_active_pairs": [{"base_id": 1, "active_id": 7}],
        "active_concern_scores": [
            {
                "active_id": 7,
                "concern_id": "SC0001",
                "relevance_score_0_100": 75.0,
            }
        ],
    }


def recommendation(*, active_ids: list[int] | None = None) -> FormulationRecommendation:
    return FormulationRecommendation(
        base_id=1,
        if_base_selected_why="Suitable for the stated texture preference.",
        actives=[
            RecommendedActive(
                active_id=active_id,
                if_active_selected_why="Supports the detected concern.",
            )
            for active_id in (active_ids if active_ids is not None else [7])
        ],
        overall_explanation="The selected active addresses the detected concern.",
    )


def test_formulation_requires_compatible_actives_covering_detected_concerns():
    scores = validate_recommendation_selection(
        candidate_information(),
        recommendation(),
    )

    assert scores == {7: {"SC0001": 75.0}}


def test_formulation_rejects_active_not_compatible_with_selected_base():
    data = candidate_information()
    data["compatible_base_active_pairs"] = []

    with pytest.raises(ValueError, match="incompatible"):
        validate_recommendation_selection(data, recommendation())


def test_formulation_rejects_concern_not_addressed_by_selected_actives():
    data = candidate_information()
    data["active_concern_scores"][0]["concern_id"] = "SC0002"

    with pytest.raises(ValueError, match="do not address every detected concern"):
        validate_recommendation_selection(data, recommendation())


def test_formulation_rejects_actives_when_no_concerns_are_detected():
    with pytest.raises(ValueError, match="must not select actives"):
        validate_recommendation_selection(
            candidate_information(detected=False),
            recommendation(),
        )


def test_formulation_rejects_candidate_sets_larger_than_top_five():
    data = candidate_information()
    data["combined_skin_concerns"] = [
        {"skin_concern_id": f"SC{number:04d}"}
        for number in range(1, 7)
    ]

    with pytest.raises(ValueError, match="maximum of 5 skin concerns"):
        validate_recommendation_selection(data, recommendation())
