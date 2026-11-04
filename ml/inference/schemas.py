"""
Pydantic schemas for ML Serving Layer (inference API).
"""
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


# ----------------------------------------------------
# Recommendation Schemas
# ----------------------------------------------------
class RecommendationRequest(BaseModel):
    budget_inr: float = Field(..., gt=0, description="Available budget in INR")
    available_time_hours: float = Field(..., gt=0, description="Available time in hours")
    traveler_count: int = Field(default=1, ge=1, description="Number of travelers")
    group_type: str = Field(default="Solo", description="Group type (Solo, Couple, Family, Friends, Group)")
    interests: Union[str, List[str]] = Field(default="", description="Pipe-separated interests string or list")
    user_lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0, description="User latitude")
    user_lon: Optional[float] = Field(default=None, ge=-180.0, le=180.0, description="User longitude")
    radius_km: Optional[float] = Field(default=None, gt=0, description="Maximum search radius in km")
    city: Optional[str] = Field(default=None, description="Optional city filter")
    category: Optional[str] = Field(default=None, description="Optional category filter")
    top_n: int = Field(default=10, ge=1, le=100, description="Number of recommendations to return")
    apply_hard_filters: bool = Field(default=True, description="Enforce affordable and fits_time hard filters")


class ExperienceItem(BaseModel):
    experience_id: str
    experience_name: str
    city: str
    district: Optional[str] = None
    state: Optional[str] = None
    category: str
    sub_category: str
    description: Optional[str] = ""
    tags: Optional[str] = ""
    best_for: Optional[str] = ""
    price_inr: float
    duration_hours: float
    rating: Optional[float] = None
    review_count: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    indoor_outdoor: Optional[str] = "Flexible"
    local_experience: bool = True
    hidden_gem: bool = False
    distance_km: Optional[float] = None
    recommendation_score: float
    interest_overlap_count: int = 0
    interest_overlap_ratio: float = 0.0


class RecommendationResponse(BaseModel):
    status: str = "success"
    count: int
    recommendations: List[ExperienceItem]


# ----------------------------------------------------
# Itinerary Schemas
# ----------------------------------------------------
class ItineraryRequest(BaseModel):
    budget_inr: float = Field(..., gt=0, description="Total budget in INR for the day")
    available_time_hours: float = Field(..., gt=0, description="Total available hours for the day")
    traveler_count: int = Field(default=1, ge=1, description="Number of travelers")
    group_type: str = Field(default="Solo", description="Group type")
    interests: Union[str, List[str]] = Field(default="", description="Pipe-separated interests or list")
    user_lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0, description="Starting latitude")
    user_lon: Optional[float] = Field(default=None, ge=-180.0, le=180.0, description="Starting longitude")
    radius_km: Optional[float] = Field(default=None, gt=0, description="Radius in km")
    city: Optional[str] = Field(default=None, description="Optional city filter")
    category: Optional[str] = Field(default=None, description="Optional category filter")
    max_stops: int = Field(default=5, ge=1, le=10, description="Maximum number of stops")
    top_candidates_pool: int = Field(default=30, ge=5, le=100, description="Candidate pool size for knapsack")


class ItineraryStop(BaseModel):
    stop_sequence: int
    experience_id: str
    experience_name: str
    category: str
    sub_category: str
    price_inr: float
    duration_hours: float
    rating: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    segment_distance_km: float = 0.0
    cumulative_duration_hours: float = 0.0
    cumulative_price_inr: float = 0.0
    recommendation_score: float


class ItineraryResponse(BaseModel):
    status: str = "success"
    stop_count: int
    total_duration_hours: float
    total_price_inr: float
    total_score: float
    remaining_budget_inr: float
    remaining_time_hours: float
    strategy_used: str
    total_route_distance_km: float
    stops: List[ItineraryStop]


# ----------------------------------------------------
# Provider Experience Submission Schemas
# ----------------------------------------------------
class ExperienceSubmissionRequest(BaseModel):
    experience_name: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    sub_category: Optional[str] = None
    city: str = Field(..., min_length=1)
    district: Optional[str] = None
    state: Optional[str] = None
    region: Optional[str] = None
    description: Optional[str] = ""
    tags: Optional[str] = ""
    best_for: Optional[str] = ""
    price_inr: float = Field(..., ge=0.0)
    duration_hours: float = Field(..., gt=0.0)
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    min_group_size: int = Field(default=1, ge=1)
    max_group_size: Optional[int] = None
    indoor_outdoor: Optional[str] = "Flexible"
    local_experience: Optional[str] = "Yes"
    hidden_gem: Optional[str] = "No"
    booking_required: Optional[str] = "No"
    advance_booking_days: Optional[int] = 0


class ExperienceSubmissionResponse(BaseModel):
    status: str = "success"
    message: str
    experience_id: str
    experience: Dict[str, Any]


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    experiences_loaded: int
    models_loaded: bool
