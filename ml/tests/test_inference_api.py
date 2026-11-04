"""
Integration tests for the ML Serving FastAPI application.
"""
import pytest
from fastapi.testclient import TestClient

from ml.inference.app import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["experiences_loaded"] > 0
    assert data["models_loaded"] is True


def test_recommend_endpoint(client):
    payload = {
        "budget_inr": 2500.0,
        "available_time_hours": 4.0,
        "traveler_count": 2,
        "group_type": "Couple",
        "interests": "Food | Heritage | Art",
        "top_n": 5,
    }
    response = client.post("/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["recommendations"]) <= 5
    if len(data["recommendations"]) > 0:
        first = data["recommendations"][0]
        assert "experience_id" in first
        assert "recommendation_score" in first
        assert first["price_inr"] <= 2500.0
        assert first["duration_hours"] <= 4.0


def test_itinerary_endpoint(client):
    payload = {
        "budget_inr": 4000.0,
        "available_time_hours": 6.0,
        "traveler_count": 2,
        "group_type": "Friends",
        "interests": "Adventure | Food",
        "max_stops": 3,
    }
    response = client.post("/itinerary", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["stop_count"] <= 3
    assert data["total_duration_hours"] <= 6.0
    assert data["total_price_inr"] <= 4000.0


def test_experiences_get_endpoint(client):
    response = client.get("/experiences?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["items"]) <= 5
