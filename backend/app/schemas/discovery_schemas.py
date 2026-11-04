"""
Discovery Canvas and Category Recommendation Schemas.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DiscoveryPlaceItem(BaseModel):
    place_id: str
    name: str
    category: str
    sub_category: Optional[str] = None
    description: Optional[str] = None
    coordinates: Dict[str, float]
    address: Optional[str] = None
    city: Optional[str] = None
    opening_hours: Optional[str] = "09:00 - 18:00"
    estimated_visit_duration_minutes: int = 60
    price_inr: float = 0.0
    rating: Optional[float] = 4.8
    review_count: Optional[int] = 100
    image_url: Optional[str] = None
    data_source: str = "curated_database"
    weather_suitability: str = "high"
    weather_rationale: Optional[str] = None
    recommendation_score: float = 0.90
    match_reasons: List[str] = Field(default_factory=list)
    is_indoor: bool = False
    is_hidden_gem: bool = False


class DiscoveryCategorySection(BaseModel):
    category_id: str
    title: str
    places: List[DiscoveryPlaceItem] = Field(default_factory=list)


class DiscoveryRequest(BaseModel):
    destination: str
    coordinates: Optional[Dict[str, float]] = None
    trip_date: Optional[str] = None
    days: Optional[int] = 1
    interests: List[str] = Field(default_factory=lambda: ["Food", "Culture"])
    group_type: str = "Solo"
    pace: str = "balanced"
    budget_inr: float = 3000.0
    weather_condition: Optional[str] = None
    top_n: int = 30


class DiscoveryResponse(BaseModel):
    success: bool = True
    destination: str
    coordinates: Dict[str, float]
    weather_context: Dict[str, Any]
    total_candidates: int
    categories: List[DiscoveryCategorySection]
    all_places: List[DiscoveryPlaceItem]
