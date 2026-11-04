"""
Comprehensive Backend Integration Tests for Recommendations and Itinerary Generation APIs.
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_recommendations_api():
    payload = {
        "destination": "Delhi",
        "budget": 3000,
        "duration_hours": 6,
        "traveler_count": 2,
        "traveler_type": "couple",
        "interests": ["food", "culture", "heritage"],
    }
    response = client.post("/api/recommendations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0

    first_item = data["recommendations"][0]
    assert "experience_id" in first_item
    assert "name" in first_item
    assert "score" in first_item
    assert "reason" in first_item
    assert "price" in first_item
    assert "duration_minutes" in first_item


def test_itinerary_generation_api():
    # 1. First get recommendations
    rec_payload = {
        "destination": "Delhi",
        "budget": 5000,
        "duration_hours": 8,
        "traveler_count": 2,
        "traveler_type": "couple",
        "interests": ["culture", "heritage"],
    }
    rec_response = client.post("/api/recommendations", json=rec_payload)
    assert rec_response.status_code == 200
    recs = rec_response.json()["recommendations"]
    assert len(recs) >= 2

    selected_ids = [recs[0]["experience_id"], recs[1]["experience_id"]]

    # 2. Generate itinerary with user-selected start time 10:30 AM
    itin_payload = {
        "destination": "Delhi",
        "trip_date": "2026-09-26",
        "start_time": "10:30 AM",
        "duration_hours": 6,
        "budget": 3000,
        "selected_experience_ids": selected_ids,
        "traveler_count": 2,
        "traveler_type": "couple",
    }
    itin_response = client.post("/api/itinerary/generate", json=itin_payload)
    assert itin_response.status_code == 200
    data = itin_response.json()

    assert data["success"] is True
    assert data["start_time"] == "10:30 AM"
    assert "scheduled_experiences" in data
    assert len(data["scheduled_experiences"]) > 0

    first_stop = data["scheduled_experiences"][0]
    assert first_stop["start_time"] == "10:30 AM"
    assert first_stop["sequence"] == 1


def test_itinerary_duration_and_budget_constraints():
    # Test budget warning when selecting expensive experiences with low budget
    rec_response = client.post("/api/recommendations", json={"destination": "Delhi", "budget": 10000})
    recs = rec_response.json()["recommendations"]
    selected_ids = [r["experience_id"] for r in recs[:4]]

    itin_payload = {
        "destination": "Delhi",
        "trip_date": "2026-09-26",
        "start_time": "11:00 AM",
        "duration_hours": 2,  # Very short duration to trigger skipped experiences
        "budget": 10,  # Very low budget to trigger warning
        "selected_experience_ids": selected_ids,
        "traveler_count": 1,
        "traveler_type": "Solo",
    }
    itin_response = client.post("/api/itinerary/generate", json=itin_payload)
    assert itin_response.status_code == 200
    data = itin_response.json()

    assert data["success"] is True
    assert data["budget_exceeded"] is True
    assert data["budget_warning"] is not None
    # All 4 user-selected experiences must be scheduled
    assert len(data["scheduled_experiences"]) == 4
