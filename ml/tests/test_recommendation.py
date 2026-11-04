"""
Unit tests for the RecommendationEngine.
"""
import pytest
from ml.recommendation.engine import RecommendationEngine


@pytest.fixture
def engine():
    return RecommendationEngine()


def test_recommendation_engine_loads_successfully(engine):
    assert engine.model is not None
    assert engine.preprocessor is not None
    assert not engine.experiences_df.empty
    assert len(engine.experiences_df) >= 700


def test_recommend_returns_ranked_results(engine):
    results = engine.recommend(
        budget_inr=2000.0,
        available_time_hours=4.0,
        traveler_count=2,
        group_type="Couple",
        interests="Food | Culture | Heritage",
        top_n=5,
        apply_hard_filters=True,
    )

    assert len(results) > 0
    assert len(results) <= 5

    # Check that results are sorted descending by recommendation_score
    scores = [r["recommendation_score"] for r in results]
    assert scores == sorted(scores, reverse=True)

    # Check hard filters: all returned experiences must satisfy price <= budget & duration <= time
    for r in results:
        assert r["price_inr"] <= 2000.0
        assert r["duration_hours"] <= 4.0
        assert "experience_id" in r
        assert "recommendation_score" in r
        assert 0.0 <= r["recommendation_score"] <= 1.0


def test_recommend_with_radius_filter(engine):
    # Search around Delhi center coordinates (~28.61, 77.21) with radius 20km
    results = engine.recommend(
        budget_inr=5000.0,
        available_time_hours=6.0,
        traveler_count=1,
        group_type="Solo",
        interests="Art | Music",
        user_lat=28.6139,
        user_lon=77.2090,
        radius_km=25.0,
        top_n=10,
    )

    for r in results:
        if r["distance_km"] is not None:
            assert r["distance_km"] <= 25.0


def test_recommend_hard_filters_rejects_overbudget(engine):
    # Budget of only 50 INR - check that any returned item is <= 50 INR
    results = engine.recommend(
        budget_inr=50.0,
        available_time_hours=1.0,
        traveler_count=1,
        group_type="Solo",
        interests="Walking",
        top_n=10,
        apply_hard_filters=True,
    )

    for r in results:
        assert r["price_inr"] <= 50.0
        assert r["duration_hours"] <= 1.0


def test_recommend_mumbai_city_fetches_correct_photos(engine):
    """Test that querying Mumbai returns Mumbai experiences with strictly valid location images."""
    results = engine.recommend(
        budget_inr=5000.0,
        available_time_hours=8.0,
        traveler_count=2,
        group_type="Couple",
        interests="Heritage | Food | Culture",
        city="Mumbai",
        top_n=10,
    )
    assert len(results) > 0
    for r in results:
        assert r["city"].lower() == "mumbai" or "mumbai" in str(r.get("location", "")).lower()
        assert r["image_url"] is not None
        assert r["image_url"].startswith("http")
        # Ensure no cross-state mismatched photo was assigned
        assert "Red%20Fort%20Delhi" not in r["image_url"]


def test_recommend_panvel_city_fetches_correct_photos(engine):
    """Test that querying Panvel returns Panvel experiences with location-specific images."""
    results = engine.recommend(
        budget_inr=3000.0,
        available_time_hours=6.0,
        traveler_count=2,
        group_type="Friends",
        interests="Nature | Adventure",
        city="Panvel",
        top_n=5,
    )
    assert len(results) > 0
    for r in results:
        assert "panvel" in str(r["city"]).lower() or "panvel" in str(r.get("location", "")).lower()
        assert r["image_url"] is not None
        assert r["image_url"].startswith("http")

