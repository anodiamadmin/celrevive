import pytest
import httpx
from unittest.mock import AsyncMock, Mock, patch
from fastapi import HTTPException
from app.services.visual_ai import analyze_image_with_ai


@pytest.fixture
def valid_mock_response_json():
    return {
        "image_skin_concerns": [
            {
                "skin_concern_id": "SC0008",
                "skin_concern_name": "Acne",
                "skin_concern_exists": True,
                "if_skin_concern_true_why": "Visible active breakouts."
            }
        ]
    }


@pytest.mark.asyncio
@patch("app.services.visual_ai.httpx.AsyncClient.post")
async def test_analyze_image_success(mock_post, valid_mock_response_json):
    """A successful API call should return a validated Pydantic model."""
    mock_response = Mock()
    mock_response.json.return_value = valid_mock_response_json
    mock_response.raise_for_status.return_value = None
    mock_post.return_value = mock_response

    result = await analyze_image_with_ai("https://mock-supabase.com/image.jpg")

    assert len(result.image_skin_concerns) == 1
    assert result.image_skin_concerns[0].skin_concern_id == "SC0008"


@pytest.mark.asyncio
@patch("app.services.visual_ai.httpx.AsyncClient.post")
async def test_analyze_image_timeout_exception(mock_post):
    """A network timeout should result in a 504 Gateway Timeout."""
    mock_post.side_effect = httpx.TimeoutException("Timeout")

    with pytest.raises(HTTPException) as exc_info:
        await analyze_image_with_ai("https://mock-supabase.com/image.jpg")

    assert exc_info.value.status_code == 504
    assert "timed out" in exc_info.value.detail


@pytest.mark.asyncio
@patch("app.services.visual_ai.httpx.AsyncClient.post")
async def test_analyze_image_http_status_error(mock_post):
    """A 500 error from the AI provider should result in a 502 Bad Gateway."""
    mock_request = httpx.Request("POST", "https://mock-vision-api.celrevive.com/analyze")
    mock_response = httpx.Response(500, request=mock_request)

    mock_post.side_effect = httpx.HTTPStatusError(
        "Server Error", request=mock_request, response=mock_response
    )

    with pytest.raises(HTTPException) as exc_info:
        await analyze_image_with_ai("https://mock-supabase.com/image.jpg")

    assert exc_info.value.status_code == 502


@pytest.mark.asyncio
@patch("app.services.visual_ai.httpx.AsyncClient.post")
async def test_analyze_image_request_error(mock_post):
    """A disconnected network should result in a 503 Service Unavailable."""
    mock_request = httpx.Request("POST", "https://mock-vision-api.celrevive.com/analyze")
    mock_post.side_effect = httpx.RequestError("Network Unreachable", request=mock_request)

    with pytest.raises(HTTPException) as exc_info:
        await analyze_image_with_ai("https://mock-supabase.com/image.jpg")

    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
@patch("app.services.visual_ai.httpx.AsyncClient.post")
async def test_analyze_image_malformed_json(mock_post):
    """An API returning invalid schema data should result in a 422 Unprocessable Entity."""
    mock_response = Mock()
    # Sending unexpected string instead of a list
    mock_response.json.return_value = {"image_skin_concerns": "This is entirely wrong."}
    mock_response.raise_for_status.return_value = None
    mock_post.return_value = mock_response

    with pytest.raises(HTTPException) as exc_info:
        await analyze_image_with_ai("https://mock-supabase.com/image.jpg")

    assert exc_info.value.status_code == 422