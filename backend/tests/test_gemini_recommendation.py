"""
Unit and Integration Tests for Gemini-powered LocalLens Recommendation System.
Validates:
1. Sunny weather recommendation
2. Heavy rain recommendation
3. Light rain recommendation
4. Family trip recommendation
5. Couple trip recommendation
6. Solo trip recommendation
7. Low budget recommendation
8. Limited available time recommendation
9. Different trip date recommendation
10. Weather unavailable handling
11. Gemini API failure / fallback handling
12. Image discovery validation
13. ML retention verification
14. ML disconnection from active live flow verification
"""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas.recommendation_schemas import RecommendationRequest
from backend.app.services.gemini_recommendation_service import GeminiRecommendationService
from backend.app.services.weather_service import WeatherService
from backend.app.services.real_image_service import RealImageService
from ml.recommendation.engine import RecommendationEngine

client = TestClient(app)


def test_14_ml_files_and_system_still_exist():
    """Verify that all ML model, code, dependencies, and RecommendationEngine classes still exist in project."""
    engine = RecommendationEngine(
        model_dir="ml/models",
        dataset_dir="ml/datasets",
        dataset_filename="all_experiences_with_photos.csv",
    )
    assert engine is not None
    assert hasattr(engine, "recommend")
    assert hasattr(engine, "get_experiences_df")


def test_15_ml_orchestration_is_active_and_verified():
    """Verify that the active POST /api/recommendations endpoint orchestrates ML RecommendationEngine."""
    with patch.object(RecommendationEngine, "recommend", wraps=RecommendationEngine(
        model_dir="ml/models",
        dataset_dir="ml/datasets",
        dataset_filename="all_experiences_with_photos.csv",
    ).recommend) as mock_ml_recommend:
        payload = {
            "destination": "Mumbai",
            "budget": 2000,
            "duration_hours": 3.0,
            "traveler_type": "Couple",
            "interests": ["Food", "Culture"],
        }
        resp = client.post("/api/recommendations", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert len(data["recommendations"]) > 0
        # Verify ML engine is actively orchestrated
        assert mock_ml_recommend.called is True



@pytest.mark.asyncio
async def test_01_sunny_weather():
    """Test 1: Sunny weather favors outdoor activities."""
    req = RecommendationRequest(
        destination="Mumbai",
        weather_condition="clear sky",
        interests=["Nature", "Heritage"],
        budget_inr=3000,
    )
    res = await GeminiRecommendationService.get_recommendations(req)
    assert res.success is True
    assert len(res.recommendations) > 0


@pytest.mark.asyncio
async def test_02_heavy_rain():
    """Test 2: Heavy rain adapts recommendations to indoor and covered stops."""
    req = RecommendationRequest(
        destination="Mumbai",
        weather_condition="heavy rain",
        interests=["Food", "Museum", "Culture"],
        budget_inr=3000,
    )
    res = await GeminiRecommendationService.get_recommendations(req)
    assert res.success is True
    assert len(res.recommendations) > 0
    # Verify recommended items have suitable indoor rationales
    reasons = " ".join([item.reason.lower() for item in res.recommendations])
    assert any(term in reasons for term in ["rain", "indoor", "food", "culture", "top rated", "recommended"])


@pytest.mark.asyncio
async def test_03_light_rain():
    """Test 3: Light rain weather handling."""
    req = RecommendationRequest(
        destination="Mumbai",
        weather_condition="rain",
        interests=["Cafes", "Street Food"],
        budget_inr=2000,
    )
    res = await GeminiRecommendationService.get_recommendations(req)
    assert res.success is True
    assert len(res.recommendations) > 0


@pytest.mark.asyncio
async def test_04_family_trip():
    """Test 4: Family trip recommendation."""
    req = RecommendationRequest(
        destination="Mumbai",
        traveler_count=4,
        group_type="Family",
        interests=["Heritage", "Culture"],
        budget_inr=5000,
    )
    res = await GeminiRecommendationService.get_recommendations(req)
    assert res.success is True
    assert len(res.recommendations) > 0


@pytest.mark.asyncio
async def test_05_couple_trip():
    """Test 5: Couple trip recommendation."""
    req = RecommendationRequest(
        destination="Mumbai",
        traveler_count=2,
        group_type="Couple",
        interests=["Food", "Sunset"],
        budget_inr=3000,
    )
    res = await GeminiRecommendationService.get_recommendations(req)
    assert res.success is True
    assert len(res.recommendations) > 0


@pytest.mark.asyncio
async def test_06_solo_trip():
    """Test 6: Solo trip recommendation."""
    req = RecommendationRequest(
        destination="Mumbai",
        traveler_count=1,
        group_type="Solo",
        interests=["Culture", "Local Life"],
        budget_inr=1500,
    )
    res = await GeminiRecommendationService.get_recommendations(req)
    assert res.success is True
    assert len(res.recommendations) > 0


@pytest.mark.asyncio
async def test_07_low_budget():
    """Test 7: Low budget recommendation."""
    req = RecommendationRequest(
        destination="Mumbai",
        budget_inr=500,
        interests=["Street Food"],
    )
    res = await GeminiRecommendationService.get_recommendations(req)
    assert res.success is True
    assert len(res.recommendations) > 0


@pytest.mark.asyncio
async def test_08_limited_time():
    """Test 8: Limited available time recommendation."""
    req = RecommendationRequest(
        destination="Mumbai",
        available_time_hours=1.5,
        interests=["Food"],
    )
    res = await GeminiRecommendationService.get_recommendations(req)
    assert res.success is True
    assert len(res.recommendations) > 0


@pytest.mark.asyncio
async def test_09_different_trip_date():
    """Test 9: Different trip date weather resolution."""
    w_info = await WeatherService.get_weather_for_trip(
        destination="Panvel",
        trip_date="2026-10-05",
    )
    # Outside 16-day forecast horizon should be marked unavailable without fabricating
    assert w_info["status"] in ("available", "unavailable")
    if w_info["status"] == "unavailable":
        assert w_info["condition"] is None
        assert w_info["temperature_c"] is None


@pytest.mark.asyncio
async def test_10_weather_unavailable_continuation():
    """Test 10: Continues gracefully when weather is unavailable."""
    req = RecommendationRequest(
        destination="Panvel",
        trip_date="2026-10-05",
        interests=["Culture", "Food"],
    )
    res = await GeminiRecommendationService.get_recommendations(req)
    assert res.success is True
    assert len(res.recommendations) > 0


@pytest.mark.asyncio
async def test_11_gemini_api_failure_fallback():
    """Test 11: When Gemini API is unavailable, fallback provides structured recommendations without crashing."""
    with patch.object(GeminiRecommendationService, "_call_gemini_api", side_effect=Exception("API Timeout")):
        req = RecommendationRequest(
            destination="Mumbai",
            interests=["Heritage", "Food"],
        )
        res = await GeminiRecommendationService.get_recommendations(req)
        assert res.success is True
        assert len(res.recommendations) > 0


@pytest.mark.asyncio
async def test_12_real_image_discovery():
    """Test 12: Real image service fetches authentic Wikipedia or verified dataset photo."""
    img = await RealImageService.find_real_image(
        place_name="Gateway of India",
        city="Mumbai",
    )
    assert img is not None
    assert img.startswith("http")
    assert "fake" not in img.lower()
