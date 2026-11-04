"""
Destination Experience and Place Management Schemas.
Enforces typed schemas for Experience CRUD and search operations.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExperienceBase(BaseModel):
    experience_name: str = Field(..., min_length=2, max_length=200, description="Name of the place or experience")
    category: str = Field(..., description="Category (e.g. 'Food', 'Culture', 'Adventure', 'Nature', 'Heritage')")
    sub_category: Optional[str] = None
    city: str = Field(..., description="City or destination name")
    state: Optional[str] = None
    country: str = "India"
    location: Optional[str] = Field(None, description="Detailed address or locality")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    description: Optional[str] = None
    tags: Optional[str] = None
    price_inr: float = Field(0.0, ge=0.0, description="Price in INR")
    currency: str = "INR"
    duration_hours: float = Field(1.0, gt=0.0, description="Duration in hours")
    duration_minutes: Optional[int] = None
    rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    review_count: Optional[int] = Field(0, ge=0)
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    indoor_outdoor: str = Field("Flexible", description="Indoor, Outdoor, or Flexible")
    weather_suitability: Optional[str] = None
    opening_hours: Optional[str] = None
    best_for: Optional[str] = None
    accessibility: Optional[List[str]] = None
    local_experience: bool = True
    hidden_gem: bool = False
    booking_required: bool = False
    source: str = "curated"
    verification_status: str = "verified"


class ExperienceCreate(ExperienceBase):
    pass


class ExperienceUpdate(BaseModel):
    experience_name: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    description: Optional[str] = None
    tags: Optional[str] = None
    price_inr: Optional[float] = Field(None, ge=0.0)
    duration_hours: Optional[float] = Field(None, gt=0.0)
    rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    image_url: Optional[str] = None
    indoor_outdoor: Optional[str] = None
    opening_hours: Optional[str] = None
    best_for: Optional[str] = None
    local_experience: Optional[bool] = None
    hidden_gem: Optional[bool] = None
    booking_required: Optional[bool] = None


class ExperienceResponse(ExperienceBase):
    experience_id: str
    id: Optional[str] = None
    distance_km: Optional[float] = None
    score: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ExperienceListResponse(BaseModel):
    success: bool = True
    count: int
    total: int
    page: int = 1
    page_size: int = 50
    experiences: List[ExperienceResponse]
