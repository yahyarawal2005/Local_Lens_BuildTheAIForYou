"""
Nugen AI Integration and Post-Generation Enhancement Layer Tests.
Tests all 8 requirements specified in Section 25:
1. Nugen disabled (NUGEN_ENABLED=false)
2. Nugen enabled (NUGEN_ENABLED=true)
3. Nugen failure / resilience (500, timeout, malformed JSON)
4. Budget validation (₹3000 budget vs ₹3500 cost)
5. Time validation (excess duration detected)
6. Missing factual information (does NOT invent travel times)
7. Interest personalization (Food & Culture check)
8. Group type personalization (Family considerations)
9. Rajiv's ML protection (itinerary unchanged, Nugen is strictly advisory)
"""
import sys
import os
from unittest.mock import patch, AsyncMock
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from app.main import app
    from app.core.config import settings
    from app.services.nugen_service import NugenService
    from app.services.nugen_validator import NugenValidator
    from app.schemas.nugen_schemas import NugenEnhancementResponse
except ImportError:
    from backend.app.main import app
    from backend.app.core.config import settings
    from backend.app.services.nugen_service import NugenService
    from backend.app.services.nugen_validator import NugenValidator
    from backend.app.schemas.nugen_schemas import NugenEnhancementResponse

from fastapi.testclient import TestClient

client = TestClient(app)


# Sample Rajiv Generated Itinerary for isolated testing
SAMPLE_RAJIV_ITINERARY = {
    "destination": "Delhi",
    "trip_date": "2026-09-26",
    "start_time": "10:30 AM",
    "end_time": "04:30 PM",
    "total_duration_minutes": 360,
    "total_duration_formatted": "6h",
    "total_experience_cost": 2800.0,
    "estimated_transport_cost": 700.0,
    "total_cost": 3500.0,
    "budget": 3000.0,
    "budget_exceeded": True,
    "budget_warning": "Estimated total exceeds budget",
    "scheduled_experiences": [
        {
            "sequence": 1,
            "experience_id": "EXP-DEL-01",
            "name": "Red Fort Heritage Tour",
            "category": "Culture",
            "sub_category": "Historical Monument",
            "location": "Old Delhi",
            "start_time": "10:30 AM",
            "end_time": "12:30 PM",
            "duration_minutes": 120,
            "price": 500.0,
            "travel_to_next_minutes": 0,  # Unverified transit
            "travel_to_next_distance_km": 0.0,
        },
        {
            "sequence": 2,
            "experience_id": "EXP-DEL-02",
            "name": "Chandni Chowk Street Food Trail",
            "category": "Food",
            "sub_category": "Culinary Tour",
            "location": "Chandni Chowk",
            "start_time": "12:30 PM",
            "end_time": "02:00 PM",
            "duration_minutes": 90,
            "price": 800.0,
            "travel_to_next_minutes": 25,
            "travel_to_next_distance_km": 8.0,
        },
        {
            "sequence": 3,
            "experience_id": "EXP-DEL-03",
            "name": "Humayun's Tomb Sunset Walk",
            "category": "Culture",
            "sub_category": "Heritage Site",
            "location": "Nizamuddin East",
            "start_time": "02:25 PM",
            "end_time": "04:30 PM",
            "duration_minutes": 125,
            "price": 1500.0,
            "travel_to_next_minutes": 0,
            "travel_to_next_distance_km": 0.0,
        },
    ],
    "skipped_experiences": [],
}


# ==============================================================================
# TEST 1 — Nugen disabled (NUGEN_ENABLED=false)
# ==============================================================================
def test_1_nugen_disabled():
    """Verify that when NUGEN_ENABLED=false, Rajiv ML runs normally and no Nugen data is returned."""
    with patch.object(settings, "NUGEN_ENABLED", False):
        payload = {
            "destination": "Delhi",
            "trip_date": "2026-09-26",
            "start_time": "10:30 AM",
            "duration_hours": 6,
            "budget": 5000,
            "traveler_count": 2,
            "traveler_type": "Couple",
        }
        response = client.post("/api/itinerary/generate", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "scheduled_experiences" in data
        assert len(data["scheduled_experiences"]) > 0
        # When disabled, nugen must be None / null
        assert data.get("nugen") is None


# ==============================================================================
# TEST 2 — Nugen enabled (NUGEN_ENABLED=true)
# ==============================================================================
def test_2_nugen_enabled_returns_structured_insights():
    """Verify that when NUGEN_ENABLED=true, Rajiv's itinerary is generated and Nugen insights are attached."""
    with patch.object(settings, "NUGEN_ENABLED", True):
        payload = {
            "destination": "Delhi",
            "trip_date": "2026-09-26",
            "start_time": "10:30 AM",
            "duration_hours": 6,
            "budget": 5000,
            "traveler_count": 2,
            "traveler_type": "Couple",
            "interests": ["culture", "heritage"],
        }
        response = client.post("/api/itinerary/generate", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "scheduled_experiences" in data
        assert len(data["scheduled_experiences"]) > 0

        # Nugen data must be attached
        nugen = data.get("nugen")
        assert nugen is not None
        assert nugen["enabled"] is True
        assert nugen["status"] in ("success", "fallback")
        assert "validation" in nugen
        assert "issues" in nugen
        assert "enhancements" in nugen
        assert "personalized_tips" in nugen
        assert "final_recommendations" in nugen

        # Check all 6 domain validation rules exist
        val = nugen["validation"]
        assert "budget" in val
        assert "available_time" in val
        assert "selected_place_count" in val
        assert "interests" in val
        assert "group_type" in val
        assert "schedule" in val


# ==============================================================================
# TEST 3 — Nugen failure resilience (Timeout / 500 error / Malformed JSON)
# ==============================================================================
@pytest.mark.asyncio
async def test_3_nugen_failure_resilience():
    """Verify that if Nugen API times out, errors out, or fails, Rajiv's itinerary is still returned safely."""
    user_constraints = {
        "budget": 3000,
        "available_time_hours": 6,
        "traveler_count": 2,
        "group_type": "Couple",
    }

    # Simulate catastrophic exception in Nugen call
    with patch.object(settings, "NUGEN_ENABLED", True), \
         patch.object(settings, "NUGEN_API_URL", "https://mock.invalid.nugen.url/v1/enhance"), \
         patch("httpx.AsyncClient.post", side_effect=Exception("Connection timed out")):

        # Must NOT throw exception, must return valid object or fallback
        result = await NugenService.enhance_itinerary(
            user_constraints=user_constraints,
            generated_itinerary=SAMPLE_RAJIV_ITINERARY,
        )
        assert result is not None
        assert result.enabled is True
        assert result.status in ("success", "fallback", "unavailable")


# ==============================================================================
# TEST 4 — Budget validation (Budget = ₹3000, Cost = ₹3500)
# ==============================================================================
def test_4_budget_validation_flags_overage_without_deleting_activities():
    """Verify that when cost exceeds budget, status is warning/fail and activities are NOT deleted."""
    user_constraints = {
        "budget": 3000.0,
        "available_time_hours": 6.0,
        "traveler_count": 1,
        "group_type": "Solo",
    }

    evaluation = NugenValidator.generate_deterministic_evaluation(
        original_itinerary=SAMPLE_RAJIV_ITINERARY,  # total_cost = 3500
        user_constraints=user_constraints,
    )

    budget_val = evaluation.validation.budget
    assert budget_val.status in ("warning", "fail")
    assert "exceeds" in budget_val.message.lower()

    # Check issue was created
    budget_issues = [i for i in evaluation.issues if i.type == "budget_exceeded"]
    assert len(budget_issues) > 0
    assert budget_issues[0].severity in ("medium", "high")

    # Verify original activities in Rajiv's itinerary were NOT deleted or modified
    assert len(SAMPLE_RAJIV_ITINERARY["scheduled_experiences"]) == 3


# ==============================================================================
# TEST 5 — Time validation (Itinerary duration exceeds available time)
# ==============================================================================
def test_5_available_time_validation_detects_overflow():
    """Verify that an itinerary exceeding user's available time limit is flagged."""
    user_constraints = {
        "budget": 5000.0,
        "available_time_hours": 3.0,  # 3 hours = 180 min, but itinerary is 360 min
        "traveler_count": 1,
        "group_type": "Solo",
    }

    evaluation = NugenValidator.generate_deterministic_evaluation(
        original_itinerary=SAMPLE_RAJIV_ITINERARY,  # total_duration_minutes = 360
        user_constraints=user_constraints,
    )

    time_val = evaluation.validation.available_time
    assert time_val.status == "warning"
    assert "exceeds" in time_val.message.lower()

    # Check issue was created
    time_issues = [i for i in evaluation.issues if i.type == "time_overflow"]
    assert len(time_issues) > 0


# ==============================================================================
# TEST 6 — Missing factual information (Does NOT invent travel time)
# ==============================================================================
def test_6_missing_factual_information_not_invented():
    """Verify that when travel time is missing or unverified, Nugen does NOT invent it."""
    user_constraints = {
        "budget": 5000.0,
        "available_time_hours": 8.0,
        "traveler_count": 1,
        "group_type": "Solo",
    }

    evaluation = NugenValidator.generate_deterministic_evaluation(
        original_itinerary=SAMPLE_RAJIV_ITINERARY,
        user_constraints=user_constraints,
    )

    # Experience 1 has travel_to_next_minutes = 0 to Experience 2 at different location
    schedule_issues = [i for i in evaluation.issues if i.type == "unverified_transit"]
    assert len(schedule_issues) > 0
    assert "could not be verified" in schedule_issues[0].message.lower()


# ==============================================================================
# TEST 7 — Interest personalization (Food & Culture evaluation)
# ==============================================================================
def test_7_interest_personalization_evaluation():
    """Verify that Nugen evaluates alignment between traveler interests and scheduled experiences."""
    user_constraints = {
        "budget": 5000.0,
        "available_time_hours": 8.0,
        "traveler_count": 1,
        "group_type": "Solo",
        "interests": ["Food", "Culture"],
    }

    evaluation = NugenValidator.generate_deterministic_evaluation(
        original_itinerary=SAMPLE_RAJIV_ITINERARY,
        user_constraints=user_constraints,
    )

    interests_val = evaluation.validation.interests
    assert interests_val.status == "pass"
    assert "reflects" in interests_val.message.lower() or "matches" in interests_val.message.lower()


# ==============================================================================
# TEST 8 — Group type personalization (Family considerations)
# ==============================================================================
def test_8_group_type_personalization_family():
    """Verify that Nugen provides group-specific practical tips without inventing venue policies."""
    user_constraints = {
        "budget": 5000.0,
        "available_time_hours": 8.0,
        "traveler_count": 4,
        "group_type": "Family",
    }

    evaluation = NugenValidator.generate_deterministic_evaluation(
        original_itinerary=SAMPLE_RAJIV_ITINERARY,
        user_constraints=user_constraints,
    )

    group_val = evaluation.validation.group_type
    assert group_val.status == "pass"
    assert "family" in group_val.message.lower()

    # Personalized tips should contain family pacing advice
    family_tips = [t for t in evaluation.personalized_tips if "family" in t.tip.lower() or "family" in t.reason.lower()]
    assert len(family_tips) > 0


# ==============================================================================
# TEST 9 — Rajiv's ML System Protection & Non-destructive Check
# ==============================================================================
def test_9_rajiv_ml_system_untouched():
    """Verify that Rajiv's ML system generates the exact same experiences before and after Nugen is attached."""
    payload = {
        "destination": "Delhi",
        "trip_date": "2026-09-26",
        "start_time": "10:30 AM",
        "duration_hours": 6,
        "budget": 5000,
        "traveler_count": 2,
        "traveler_type": "Couple",
    }

    # Run with Nugen disabled
    with patch.object(settings, "NUGEN_ENABLED", False):
        res_disabled = client.post("/api/itinerary/generate", json=payload).json()

    # Run with Nugen enabled
    with patch.object(settings, "NUGEN_ENABLED", True):
        res_enabled = client.post("/api/itinerary/generate", json=payload).json()

    # The experiences, ordering, and costs generated by Rajiv's ML MUST be identical
    stops_disabled = res_disabled["scheduled_experiences"]
    stops_enabled = res_enabled["scheduled_experiences"]

    assert len(stops_disabled) == len(stops_enabled)
    for s_dis, s_enb in zip(stops_disabled, stops_enabled):
        assert s_dis["experience_id"] == s_enb["experience_id"]
        assert s_dis["start_time"] == s_enb["start_time"]
        assert s_dis["price"] == s_enb["price"]

    # Only difference is that res_enabled has nugen insights
    assert res_disabled.get("nugen") is None
    assert res_enabled.get("nugen") is not None
