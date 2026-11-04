"""
Pydantic Schemas for Recommendation Endpoint.
Supports exact prompt specifications as well as existing app aliases.
"""
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, model_validator


class RecommendationRequest(BaseModel):
    """
    Traveler preference request for ML recommendation scoring.
    Supports exact parameters from Jupyter Notebook & Flutter app.
    """
    # Location coordinates
    destination: Optional[str] = Field(default="", description="Target destination or city")
    destination_city: Optional[str] = Field(default=None, description="Target destination city name alias")
    destination_lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0, description="Destination latitude")
    destination_lon: Optional[float] = Field(default=None, ge=-180.0, le=180.0, description="Destination longitude")
    
    # User / Origin Coordinates (for pickup, distance from current location, etc.)
    user_lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0, description="Traveler phone GPS latitude")
    user_lon: Optional[float] = Field(default=None, ge=-180.0, le=180.0, description="Traveler phone GPS longitude")
    start_lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0, description="Traveler start latitude alias")
    start_lon: Optional[float] = Field(default=None, ge=-180.0, le=180.0, description="Traveler start longitude alias")
    start_location: Optional[str] = Field(default=None, description="Starting text address or landmark")
    
    # Budget & Duration
    budget_inr: Optional[float] = Field(default=None, ge=0, description="Total budget in INR")
    budget: Optional[float] = Field(default=None, ge=0, description="Budget in INR (alias)")
    
    available_time_hours: Optional[float] = Field(default=None, ge=0, description="Available duration in hours")
    duration_hours: Optional[float] = Field(default=None, ge=0, description="Duration in hours (alias)")
    
    # Group & Preferences
    traveler_count: int = Field(default=1, ge=1, description="Number of travelers")
    group_type: Optional[str] = Field(default=None, description="Group type (Solo, Couple, Friends, Family, Group)")
    traveler_type: Optional[str] = Field(default=None, description="Traveler type alias")
    
    interests: Union[List[str], str] = Field(default_factory=list, description="List of interests or pipe-separated string")
    accessibility: Optional[List[str]] = Field(default_factory=list, description="Accessibility requirements")
    additional_preferences: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional preference notes")
    
    # Date & Weather
    trip_date: Optional[str] = Field(default=None, description="Trip date in YYYY-MM-DD or readable format")
    weather_condition: Optional[str] = Field(default=None, description="Optional simulated or override weather condition")

    # Filtering parameters
    city: Optional[str] = Field(default=None, description="Optional city filter")
    category: Optional[str] = Field(default=None, description="Optional category filter")
    excluded_categories: Optional[Union[List[str], str]] = Field(default_factory=list, description="Categories to completely exclude from recommendations")
    radius_km: float = Field(default=25.0, gt=0, description="Search radius in km from user coordinates")
    top_n: int = Field(default=50, ge=1, le=100, description="Number of ranked experiences to return")
    apply_hard_filters: bool = Field(default=False, description="Whether to filter out experiences exceeding individual budget or time")

    @model_validator(mode="after")
    def normalize_fields(self):
        # Resolve coordinates
        if self.user_lat is None and self.start_lat is not None:
            self.user_lat = self.start_lat
        if self.user_lon is None and self.start_lon is not None:
            self.user_lon = self.start_lon
        self.start_lat = self.user_lat
        self.start_lon = self.user_lon

        # Resolve budget
        if self.budget_inr is None and self.budget is not None:
            self.budget_inr = self.budget
        elif self.budget_inr is None:
            self.budget_inr = 2500.0
        self.budget = self.budget_inr

        # Resolve duration
        if self.available_time_hours is None and self.duration_hours is not None:
            self.available_time_hours = self.duration_hours
        elif self.available_time_hours is None:
            self.available_time_hours = 4.0
        self.duration_hours = self.available_time_hours

        # Resolve group type
        if not self.group_type and self.traveler_type:
            self.group_type = self.traveler_type
        elif not self.group_type:
            self.group_type = "Solo"
        self.traveler_type = self.group_type

        return self


class RecommendationItem(BaseModel):
    """
    Individual ranked experience recommended by the ML model.
    Contains real Supabase fields, image_url, and recommendation score.
    """
    experience_id: str
    experience_name: str
    name: str  # alias for frontend
    image_url: Optional[str] = None
    image: Optional[str] = None  # alias for frontend
    category: str
    sub_category: Optional[str] = None
    location: str
    city: str
    district: Optional[str] = None
    state: Optional[str] = None
    price_inr: float
    price: float  # alias for frontend
    duration_hours: float
    duration_minutes: int
    rating: Optional[float] = None
    review_count: Optional[int] = None
    distance_km: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    recommendation_score: float
    score: float  # alias for frontend
    reason: str
    tags: Optional[Union[List[str], str]] = None
    best_for: Optional[str] = None
    local_experience: bool = True
    hidden_gem: bool = False
    indoor_outdoor: Optional[str] = "Flexible"
    booking_required: bool = False


class RecommendationResponse(BaseModel):
    """
    Structured response returned by POST /api/recommendations
    """
    success: bool = True
    count: int
    recommendations: List[RecommendationItem]


class SmartSearchRequest(BaseModel):
    """
    Natural language query from the traveler search bar.
    e.g. "I have 2 hr my budget is 1500 I am with couple I have to visit 3 places my interest is street food and sunset"
    """
    query: str = Field(..., description="Natural language search prompt from traveler")
    user_lat: Optional[float] = Field(default=None, description="Current latitude")
    user_lon: Optional[float] = Field(default=None, description="Current longitude")
    city: Optional[str] = Field(default=None, description="Fallback or current city")


class ParsedTravelIntent(BaseModel):
    """
    Structured parameters extracted by Groq LLM from the traveler's free-form prompt.
    """
    destination: Optional[str] = None
    available_time_hours: float = 4.0
    budget_inr: float = 2500.0
    traveler_count: int = 1
    group_type: str = "Solo"
    interests: List[str] = Field(default_factory=list)
    desired_experience_count: int = 3
    keywords: List[str] = Field(default_factory=list)
    vibe_summary: str = ""


class SmartSearchResponse(BaseModel):
    """
    Response returned by POST /api/recommendations/smart-search
    """
    success: bool = True
    parsed_intent: ParsedTravelIntent
    count: int
    recommendations: List[RecommendationItem]
