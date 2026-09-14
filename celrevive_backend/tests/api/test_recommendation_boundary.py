import pytest


@pytest.mark.skip(
    reason="Recommendation response generation is work item 2.6 and is not implemented in the 2.5 scope"
)
def test_image_based_recommendation_response():
    """Enable when the 2.6 recommendation endpoint exists."""


@pytest.mark.skip(
    reason="User Story 2 recommendation acceptance criteria depend on work item 2.6"
)
def test_user_story_2_acceptance_criteria():
    """Enable when combined concerns and recommendation output are implemented."""