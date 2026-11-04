"""
Profile and Traveler Preferences Schemas.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class TravelerPreferencesSchema(BaseModel):
    traveler_type: str = Field(default="solo", description="solo, couple, family, friends")
    interests: List[str] = Field(default_factory=lambda: ["Food", "Culture"])
    travel_pace: str = Field(default="balanced", description="relaxed, balanced, fast-paced")
    budget_currency: str = Field(default="INR")
    budget_amount_per_person_per_day: Optional[float] = None
    accessibility_requirements: List[str] = Field(default_factory=list)
    dietary_preferences: List[str] = Field(default_factory=list)
    preferred_start_time: Optional[str] = "09:00:00"
    preferred_transport: Optional[str] = "flexible"


class ProfileResponse(BaseModel):
    id: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    role: str = "traveler"
    traveler_type: str = "solo"
    travel_pace: str = "balanced"
    budget_preference: str = "moderate"
    language: str = "en"
    interests: List[str] = Field(default_factory=list)
    accessibility: List[str] = Field(default_factory=list)
    preferences: Optional[TravelerPreferencesSchema] = None


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    traveler_type: Optional[str] = None
    travel_pace: Optional[str] = None
    budget_preference: Optional[str] = None
    language: Optional[str] = None
    interests: Optional[List[str]] = None
    accessibility: Optional[List[str]] = None
