"""
Comprehensive Test Suite for Traveler Web Backend & AI Pipeline.
Tests authentication, profiles, destinations geocoding, weather, discovery canvas,
multi-day itineraries, saved places, and feedback.
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings

client = TestClient(app)


# ------------------------------------------------------------------------------
# 1. Health & Diagnostics
# ------------------------------------------------------------------------------
def test_health_endpoints():
    r1 = client.get("/health")
    assert r1.status_code == 200
    data1 = r1.json()
    assert data1 == {"status": "ok"}

    r2 = client.get("/api/v1/health")
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["status"] == "ok"
    assert "ml_model_loaded" in data2
    assert data2["catalog_size"] > 0


# ------------------------------------------------------------------------------
# 2. Authentication & Profiles
# ------------------------------------------------------------------------------
def test_profiles_unauthorized():
    """Unauthenticated requests must be rejected with 401."""
    resp = client.get("/api/v1/profiles/me")
    assert resp.status_code == 401
    assert "detail" in resp.json() or "error" in resp.json()


def test_profiles_invalid_token():
    """Malformed tokens must return 401."""
    resp = client.get(
        "/api/v1/profiles/me",
        headers={"Authorization": "Bearer invalid_garbage_token_123"},
    )
    assert resp.status_code == 401


def test_profiles_valid_jwt():
    """Valid JWT grants profile access and provisions profile."""
    import time
    import jwt

    # Craft test Supabase JWT
    payload = {
        "sub": "user_test_uuid_12345",
        "email": "test_traveler@locallens.app",
        "role": "authenticated",
        "aud": "authenticated",
        "user_metadata": {
            "full_name": "Antigravity Explorer",
        },
        "exp": int(time.time()) + 3600,
    }
    token = jwt.encode(payload, "test_secret", algorithm="HS256")

    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/v1/profiles/me", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "user_test_uuid_12345"
    assert data["email"] == "test_traveler@locallens.app"
    assert data["display_name"] == "Antigravity Explorer"
    assert data["role"] == "traveler"


def test_profile_update_and_preferences():
    """Updating profile and preferences functions correctly."""
    import time
    import jwt

    user_id = "user_pref_test_777"
    token = jwt.encode(
        {"sub": user_id, "email": "pref@locallens.app", "exp": int(time.time()) + 3600},
        "test_secret",
        algorithm="HS256",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Update Profile
    patch_resp = client.patch(
        "/api/v1/profiles/me",
        headers=headers,
        json={
            "traveler_type": "couple",
            "travel_pace": "relaxed",
            "language": "hi",
            "interests": ["Heritage", "Food"],
        },
    )
    assert patch_resp.status_code == 200
    p_data = patch_resp.json()
    assert p_data["traveler_type"] == "couple"
    assert p_data["travel_pace"] == "relaxed"
    assert p_data["language"] == "hi"

    # 2. Update Preferences
    pref_resp = client.put(
        "/api/v1/profiles/me/preferences",
        headers=headers,
        json={
            "traveler_type": "couple",
            "interests": ["Photography", "Nature"],
            "travel_pace": "relaxed",
            "budget_currency": "INR",
            "budget_amount_per_person_per_day": 3500.0,
        },
    )
    assert pref_resp.status_code == 200
    pref_data = pref_resp.json()
    assert pref_data["budget_amount_per_person_per_day"] == 3500.0

    # 3. Read back Preferences
    get_pref = client.get("/api/v1/profiles/me/preferences", headers=headers)
    assert get_pref.status_code == 200
    assert get_pref.json()["interests"] == ["Photography", "Nature"]


# ------------------------------------------------------------------------------
# 3. Destinations Geocoding
# ------------------------------------------------------------------------------
def test_destinations_search_known():
    resp = client.get("/api/v1/destinations/search?q=Jaipur")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["count"] > 0
    first = data["results"][0]
    assert "Jaipur" in first["name"] or "Jaipur" in first["normalized_name"]
    assert 26.0 <= first["coordinates"]["lat"] <= 28.0
    assert 74.0 <= first["coordinates"]["lng"] <= 76.5


def test_destinations_search_validation():
    # Min length 2 validation
    resp = client.get("/api/v1/destinations/search?q=a")
    assert resp.status_code == 422


# ------------------------------------------------------------------------------
# 4. Weather Engine
# ------------------------------------------------------------------------------
def test_weather_current():
    resp = client.get("/api/v1/weather/current?destination=Mumbai")
    assert resp.status_code == 200
    data = resp.json()
    assert "condition" in data
    assert "temperature_c" in data
    assert data["coordinates"]["lat"] is not None


def test_weather_forecast():
    resp = client.get("/api/v1/weather/forecast?destination=Jaipur&days=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "available"
    assert len(data["daily"]) == 5
    assert data["daily"][0]["condition"] is not None


def test_weather_trip_summary():
    resp = client.get("/api/v1/weather/trip-summary?destination=Goa&start_date=2026-11-05&days=3")
    assert resp.status_code == 200
    data = resp.json()
    assert data["destination"] == "Goa"
    assert "overall_condition" in data
    assert "weather_advice" in data


# ------------------------------------------------------------------------------
# 5. Weather-Smart Discovery Canvas
# ------------------------------------------------------------------------------
def test_discovery_recommendations():
    payload = {
        "destination": "Jaipur",
        "trip_date": "2026-11-05",
        "days": 2,
        "interests": ["heritage", "street_food"],
        "group_type": "Couple",
        "pace": "balanced",
        "budget_inr": 5000.0,
        "top_n": 20,
    }
    resp = client.post("/api/v1/discovery/recommendations", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["destination"] == "Jaipur"
    assert len(data["categories"]) == 6  # 6 supported categories
    assert len(data["all_places"]) > 0

    # Ensure no fabricated place attributes
    first_place = data["all_places"][0]
    assert first_place["place_id"] is not None
    assert first_place["name"] is not None
    assert first_place["coordinates"]["lat"] is not None
    assert first_place["coordinates"]["lng"] is not None
    assert first_place["weather_suitability"] in ("high", "moderate", "low")


# ------------------------------------------------------------------------------
# 6. Multi-Day Itinerary Generation & Ownership CRUD
# ------------------------------------------------------------------------------
def test_itinerary_v1_generate_and_crud():
    import time
    import jwt

    user_id = "user_itin_test_999"
    token = jwt.encode(
        {"sub": user_id, "email": "itin_user@locallens.app", "exp": int(time.time()) + 3600},
        "test_secret",
        algorithm="HS256",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Generate multi-day itinerary
    req_payload = {
        "destination": "Jaipur, India",
        "coordinates": {"lat": 26.9124, "lng": 75.7873},
        "start_date": "2026-11-05",
        "days": 3,
        "pace": "balanced",
        "traveler_type": "couple",
        "interests": ["heritage", "street_food", "photography"],
        "budget": {"currency": "INR", "amount_per_person_per_day": 3000},
    }
    gen_resp = client.post("/api/v1/itineraries/generate", headers=headers, json=req_payload)
    assert gen_resp.status_code == 200
    itin = gen_resp.json()

    itin_id = itin["itinerary_id"]
    assert itin_id.startswith("ITIN-")
    assert itin["destination"]["name"] == "Jaipur, India"
    assert len(itin["days"]) == 3
    assert itin["days"][0]["day_number"] == 1
    assert len(itin["days"][0]["activities"]) >= 2

    # Check grounded activity attributes
    act = itin["days"][0]["activities"][0]
    assert act["place_id"] is not None
    assert act["name"] is not None
    assert act["start_time"] is not None
    assert act["end_time"] is not None
    assert act["weather_rationale"] is not None
    assert act["coordinates"]["lat"] != 0.0

    # 2. List user itineraries
    list_resp = client.get("/api/v1/itineraries", headers=headers)
    assert list_resp.status_code == 200
    my_itins = list_resp.json()
    assert any(i.get("id") == itin_id or i.get("itinerary_id") == itin_id for i in my_itins)

    # 3. Get single itinerary by ID
    get_resp = client.get(f"/api/v1/itineraries/{itin_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["destination_name"] == "Jaipur, India"

    # 4. Unauthorized user cannot access another user's itinerary
    other_token = jwt.encode(
        {"sub": "different_intruder_user", "exp": int(time.time()) + 3600},
        "test_secret",
        algorithm="HS256",
    )
    unauth_resp = client.get(
        f"/api/v1/itineraries/{itin_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert unauth_resp.status_code == 404

    # 5. Patch itinerary
    patch_resp = client.patch(
        f"/api/v1/itineraries/{itin_id}",
        headers=headers,
        json={"notes": "Special anniversary trip to Jaipur"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["notes"] == "Special anniversary trip to Jaipur"

    # 6. Delete itinerary
    del_resp = client.delete(f"/api/v1/itineraries/{itin_id}", headers=headers)
    assert del_resp.status_code == 200

    # Verify deleted
    verify_del = client.get(f"/api/v1/itineraries/{itin_id}", headers=headers)
    assert verify_del.status_code == 404


# ------------------------------------------------------------------------------
# 7. Saved Places & Wishlist
# ------------------------------------------------------------------------------
def test_saved_places_flow():
    import time
    import jwt

    user_id = "user_saved_place_test"
    token = jwt.encode(
        {"sub": user_id, "exp": int(time.time()) + 3600},
        "test_secret",
        algorithm="HS256",
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Save place
    save_resp = client.post(
        "/api/v1/saved-places",
        headers=headers,
        json={
            "place_id": "EXP-BEACH-001",
            "place_data": {"name": "Kashid Beach", "category": "Nature"},
            "notes": "Must visit at sunset",
        },
    )
    assert save_resp.status_code == 201
    assert save_resp.json()["place_id"] == "EXP-BEACH-001"

    # 2. List saved places
    list_resp = client.get("/api/v1/saved-places", headers=headers)
    assert list_resp.status_code == 200
    saved = list_resp.json()
    assert saved["count"] >= 1
    assert any(p["place_id"] == "EXP-BEACH-001" for p in saved["places"])

    # 3. Delete saved place
    del_resp = client.delete("/api/v1/saved-places/EXP-BEACH-001", headers=headers)
    assert del_resp.status_code == 200

    # List again to verify removal
    list_after = client.get("/api/v1/saved-places", headers=headers)
    assert not any(p["place_id"] == "EXP-BEACH-001" for p in list_after.json()["places"])


# ------------------------------------------------------------------------------
# 8. Feedback Endpoint
# ------------------------------------------------------------------------------
def test_feedback_submission():
    resp = client.post(
        "/api/v1/feedback",
        json={
            "itinerary_id": "ITIN-TEST-SAMPLE",
            "place_id": "EXP-FOOD-001",
            "rating": 5,
            "feedback_type": "place",
            "comments": "The breakfast walk was absolutely phenomenal!",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["success"] is True
    assert data["rating"] == 5
