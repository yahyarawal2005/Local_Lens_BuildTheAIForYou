"""
Comprehensive Test Suite for Complete Master Backend V1 Architecture.
Tests new routes: Preferences, Experiences CRUD, Maps/Routes, Discovery Categories,
Readiness probes, Weather POST trip-summary, Day regeneration, and Security access controls.
"""
import time
import jwt
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)

# Helper to create valid JWT tokens for specific test users
def create_test_jwt(user_id: str, email: str = "traveler@example.com") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
        "user_metadata": {"full_name": f"Test {user_id}"},
    }
    return jwt.encode(payload, "test_secret", algorithm="HS256")


# ------------------------------------------------------------------------------
# 1. Health & Readiness
# ------------------------------------------------------------------------------
def test_readiness_probe():
    resp = client.get("/api/v1/health/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "database" in data
    assert "ml_inference" in data


# ------------------------------------------------------------------------------
# 2. Preferences API (GET / PUT /api/v1/preferences)
# ------------------------------------------------------------------------------
def test_preferences_api():
    user_token = create_test_jwt("user_pref_test_101")
    headers = {"Authorization": f"Bearer {user_token}"}

    # GET default preferences
    get_res = client.get("/api/v1/preferences", headers=headers)
    assert get_res.status_code == 200
    p_data = get_res.json()
    assert "interests" in p_data

    # PUT update preferences
    put_payload = {
        "traveler_type": "couple",
        "interests": ["nature", "food", "photography"],
        "travel_pace": "relaxed",
        "budget_currency": "INR",
        "budget_amount_per_person_per_day": 3500.0,
        "accessibility_requirements": [],
        "dietary_preferences": ["vegetarian"],
        "preferred_start_time": "10:00:00",
        "preferred_transport": "cab",
    }
    put_res = client.put("/api/v1/preferences", json=put_payload, headers=headers)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["traveler_type"] == "couple"
    assert "photography" in updated["interests"]
    assert updated["budget_amount_per_person_per_day"] == 3500.0


# ------------------------------------------------------------------------------
# 3. Destinations Detail API (GET /api/v1/destinations/{destination_id})
# ------------------------------------------------------------------------------
def test_destination_detail_api():
    resp = client.get("/api/v1/destinations/jaipur")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    dest = data["destination"]
    assert "jaipur" in dest["name"].lower() or "jaipur" in dest["city"].lower()
    assert "coordinates" in dest
    assert dest["coordinates"]["lat"] > 0


# ------------------------------------------------------------------------------
# 4. Experiences Catalog & CRUD API
# ------------------------------------------------------------------------------
def test_experiences_list_and_filters():
    # 1. List with destination filter
    resp = client.get("/api/v1/experiences?destination=Delhi&page_size=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "experiences" in data
    assert len(data["experiences"]) > 0

    first_exp = data["experiences"][0]
    assert "experience_id" in first_exp
    assert "experience_name" in first_exp
    assert "category" in first_exp
    assert "price_inr" in first_exp
    assert "image_url" in first_exp

    # 2. Detail by ID
    exp_id = first_exp["experience_id"]
    det_resp = client.get(f"/api/v1/experiences/{exp_id}")
    assert det_resp.status_code == 200
    det_data = det_resp.json()
    assert det_data["experience_id"] == exp_id

    # 3. Category filter
    cat_resp = client.get("/api/v1/experiences?category=Food&page_size=5")
    assert cat_resp.status_code == 200
    for item in cat_resp.json()["experiences"]:
        assert "food" in item["category"].lower() or "culinary" in str(item.get("sub_category", "")).lower()


def test_experience_crud_flow():
    admin_token = create_test_jwt("provider_admin_test")
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create Experience
    new_exp = {
        "experience_name": "Sunrise Hot Air Balloon Safari",
        "category": "Adventure",
        "sub_category": "Aerial",
        "city": "Jaipur",
        "location": "Amer, Jaipur",
        "latitude": 26.9855,
        "longitude": 75.8513,
        "description": "Breathtaking panoramic sunrise balloon flight over historic Amber forts.",
        "tags": "balloon; sunrise; adventure; aerial",
        "price_inr": 8500.0,
        "duration_hours": 2.5,
        "rating": 4.9,
        "indoor_outdoor": "Outdoor",
        "local_experience": True,
        "booking_required": True,
    }
    create_res = client.post("/api/v1/experiences", json=new_exp, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    created_id = created_data["experience_id"]
    assert created_data["experience_name"] == new_exp["experience_name"]

    # 2. Update Experience
    update_res = client.patch(
        f"/api/v1/experiences/{created_id}",
        json={"price_inr": 7999.0, "description": "Updated promo discount description"},
        headers=headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["price_inr"] == 7999.0

    # 3. Delete Experience
    del_res = client.delete(f"/api/v1/experiences/{created_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


# ------------------------------------------------------------------------------
# 5. Discovery Categories
# ------------------------------------------------------------------------------
def test_discovery_categories():
    resp = client.get("/api/v1/discovery/categories")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["count"] >= 5
    ids = [c["id"] for c in data["categories"]]
    assert "food" in ids
    assert "culture" in ids
    assert "adventure" in ids


# ------------------------------------------------------------------------------
# 6. Weather POST Trip Summary
# ------------------------------------------------------------------------------
def test_weather_post_trip_summary():
    payload = {
        "destination": "Goa",
        "start_date": "2026-11-10",
        "days": 4,
        "lat": 15.2993,
        "lon": 74.1240,
    }
    resp = client.post("/api/v1/weather/trip-summary", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["destination"] == "Goa"
    assert data["days_count"] == 4
    assert "overall_condition" in data
    assert "outdoor_suitability" in data
    assert "weather_advice" in data


# ------------------------------------------------------------------------------
# 7. Maps & Routing API
# ------------------------------------------------------------------------------
def test_maps_routing_api():
    payload = {
        "origin": {"lat": 19.0760, "lng": 72.8777, "name": "Mumbai Center"},
        "destination": {"lat": 18.9220, "lng": 72.8347, "name": "Gateway of India"},
        "travel_mode": "driving",
    }
    resp = client.post("/api/v1/maps/route", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["total_distance_km"] > 0
    assert data["total_duration_minutes"] > 0
    assert len(data["segments"]) == 1
    assert len(data["polyline"]) > 1


def test_maps_nearby_places_api():
    resp = client.get("/api/v1/maps/nearby?lat=28.6139&lon=77.2090&radius_km=20&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "places" in data
    assert data["count"] > 0


# ------------------------------------------------------------------------------
# 8. Feedback GET API
# ------------------------------------------------------------------------------
def test_feedback_get_api():
    user_token = create_test_jwt("feedback_test_user")
    headers = {"Authorization": f"Bearer {user_token}"}

    # Submit feedback
    client.post(
        "/api/v1/feedback",
        json={"place_id": "EXP-DELHI-001", "rating": 5, "comments": "Outstanding authentic food walk!"},
        headers=headers,
    )

    # Retrieve feedback
    res = client.get("/api/v1/feedback", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["count"] >= 1


# ------------------------------------------------------------------------------
# 9. Security & Resource Ownership Isolation
# ------------------------------------------------------------------------------
def test_security_user_data_isolation():
    token_a = create_test_jwt("user_alice_456")
    token_b = create_test_jwt("user_bob_789")

    # Alice creates a saved place
    save_res = client.post(
        "/api/v1/saved-places",
        json={"place_id": "EXP-SECRET-ALICE", "notes": "Alice's private bookmark"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert save_res.status_code == 201

    # Bob lists his saved places - Alice's place MUST NOT be visible to Bob
    bob_list_res = client.get(
        "/api/v1/saved-places",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert bob_list_res.status_code == 200
    bob_places = [p["place_id"] for p in bob_list_res.json()["places"]]
    assert "EXP-SECRET-ALICE" not in bob_places
