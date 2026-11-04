"""
Unit tests for ItineraryOptimizer.
"""
import pytest
from ml.itinerary.optimizer import ItineraryOptimizer


@pytest.fixture
def optimizer():
    return ItineraryOptimizer()


@pytest.fixture
def sample_candidates():
    return [
        {
            "experience_id": "EXP-101",
            "experience_name": "Old Delhi Street Food Walk",
            "category": "Culinary",
            "sub_category": "Food Tour",
            "price_inr": 800.0,
            "duration_hours": 2.5,
            "rating": 4.8,
            "latitude": 28.6506,
            "longitude": 77.2304,
            "recommendation_score": 0.88,
        },
        {
            "experience_id": "EXP-102",
            "experience_name": "Pottery Workshop",
            "category": "Art & Workshops",
            "sub_category": "Crafts",
            "price_inr": 600.0,
            "duration_hours": 1.5,
            "rating": 4.6,
            "latitude": 28.5355,
            "longitude": 77.2410,
            "recommendation_score": 0.75,
        },
        {
            "experience_id": "EXP-103",
            "experience_name": "Sufi Music Night at Nizamuddin",
            "category": "Heritage & Culture",
            "sub_category": "Music & Performance",
            "price_inr": 300.0,
            "duration_hours": 2.0,
            "rating": 4.9,
            "latitude": 28.5913,
            "longitude": 77.2435,
            "recommendation_score": 0.92,
        },
        {
            "experience_id": "EXP-104",
            "experience_name": "Luxury Royal Dining Experience",
            "category": "Culinary",
            "sub_category": "Fine Dining",
            "price_inr": 4500.0,
            "duration_hours": 3.0,
            "rating": 4.7,
            "latitude": 28.6000,
            "longitude": 77.2200,
            "recommendation_score": 0.95,
        },
    ]


def test_itinerary_optimizer_respects_time_and_budget_caps(optimizer, sample_candidates):
    time_cap = 5.0
    budget_cap = 2000.0

    result = optimizer.optimize_itinerary(
        candidate_experiences=sample_candidates,
        available_time_hours=time_cap,
        budget_inr=budget_cap,
        user_lat=28.6139,
        user_lon=77.2090,
        max_stops=4,
    )

    assert result["stop_count"] > 0
    assert result["total_duration_hours"] <= time_cap
    assert result["total_price_inr"] <= budget_cap
    assert result["remaining_budget_inr"] >= 0
    assert result["remaining_time_hours"] >= 0

    # The 4500 INR luxury item cannot be chosen since budget is 2000 INR
    chosen_ids = [s["experience_id"] for s in result["stops"]]
    assert "EXP-104" not in chosen_ids


def test_itinerary_optimizer_geographic_ordering(optimizer, sample_candidates):
    result = optimizer.optimize_itinerary(
        candidate_experiences=sample_candidates,
        available_time_hours=8.0,
        budget_inr=5000.0,
        user_lat=28.6500,
        user_lon=77.2300,
        max_stops=4,
    )

    stops = result["stops"]
    assert len(stops) >= 2

    # Check sequence indices
    sequences = [s["stop_sequence"] for s in stops]
    assert sequences == list(range(1, len(stops) + 1))

    # Check cumulative tracking
    assert stops[-1]["cumulative_duration_hours"] == result["total_duration_hours"]
    assert stops[-1]["cumulative_price_inr"] == result["total_price_inr"]


def test_itinerary_optimizer_empty_candidates(optimizer):
    result = optimizer.optimize_itinerary(
        candidate_experiences=[],
        available_time_hours=4.0,
        budget_inr=1000.0,
    )
    assert result["stop_count"] == 0
    assert result["stops"] == []
    assert result["total_price_inr"] == 0.0
    assert result["total_duration_hours"] == 0.0
