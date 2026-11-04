"""
Pydantic Schemas for Itinerary Generation Endpoint.
Supports exact specifications from prompt and Flutter model compatibility.
"""
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, model_validator

try:
    from backend.app.schemas.nugen_schemas import NugenEnhancementResponse
except ImportError:
    from app.schemas.nugen_schemas import NugenEnhancementResponse


class ItineraryGenerateRequest(BaseModel):
    """
    Request payload to generate a chronological itinerary from selected experiences.
    """
    # Trip date and start time
    trip_date: str = Field(default="2026-09-26", description="Trip start date (YYYY-MM-DD)")
    start_time: str = Field(default="10:30", description="User selected trip start time (e.g. '10:30' or '10:30 AM')")
    timezone: Optional[str] = Field(default="Asia/Kolkata", description="Timezone of the trip")
    
    # Selected experiences
    selected_experience_ids: List[str] = Field(default_factory=list, description="List of traveler-selected experience IDs")
    
    # Budget & Duration
    budget_inr: Optional[float] = Field(default=None, ge=0, description="Total budget in INR")
    budget: Optional[float] = Field(default=None, ge=0, description="Budget in INR (alias)")
    
    available_time_hours: Optional[float] = Field(default=None, ge=0, description="Available duration window in hours")
    duration_hours: Optional[float] = Field(default=None, ge=0, description="Available duration window in hours (alias)")
    
    # Location
    user_lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0, description="Traveler latitude")
    user_lon: Optional[float] = Field(default=None, ge=-180.0, le=180.0, description="Traveler longitude")
    start_lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0, description="Starting latitude (alias)")
    start_lon: Optional[float] = Field(default=None, ge=-180.0, le=180.0, description="Starting longitude (alias)")
    start_location: Optional[str] = Field(default=None, description="Starting text address")
    destination: Optional[str] = Field(default="", description="Destination or city name")
    
    # Group
    traveler_count: int = Field(default=1, ge=1, description="Number of travelers")
    group_type: Optional[str] = Field(default=None, description="Group type (Solo, Couple, Friends, Family, Group)")
    traveler_type: Optional[str] = Field(default=None, description="Group type alias")

    # Environmental & Weather Context
    weather_condition: Optional[str] = Field(default=None, description="Simulated or active weather condition (e.g. 'Clear Sky', 'Rain Showers', 'Thunderstorm', 'Extreme Heat')")
    weather_data: Optional[Dict[str, Any]] = Field(default=None, description="Custom meteorological data override")

    @model_validator(mode="after")
    def normalize_fields(self):
        if self.budget_inr is None and self.budget is not None:
            self.budget_inr = self.budget
        elif self.budget_inr is None:
            self.budget_inr = 4000.0
        self.budget = self.budget_inr

        if self.available_time_hours is None and self.duration_hours is not None:
            self.available_time_hours = self.duration_hours
        elif self.available_time_hours is None:
            self.available_time_hours = 5.0
        self.duration_hours = self.available_time_hours

        if self.user_lat is None and self.start_lat is not None:
            self.user_lat = self.start_lat
        if self.user_lon is None and self.start_lon is not None:
            self.user_lon = self.start_lon
        self.start_lat = self.user_lat
        self.start_lon = self.user_lon

        if not self.group_type and self.traveler_type:
            self.group_type = self.traveler_type
        elif not self.group_type:
            self.group_type = "Solo"
        self.traveler_type = self.group_type

        return self


class ScheduledExperience(BaseModel):
    """
    Individual scheduled experience stop with precise time window and travel details.
    """
    sequence: int
    experience_id: str
    experience_name: str
    name: str  # alias
    category: str
    sub_category: Optional[str] = None
    location: str
    description: Optional[str] = ""
    image_url: Optional[str] = None
    image: Optional[str] = None  # alias
    start_time: str
    end_time: str
    duration_minutes: int
    duration_hours: Optional[float] = None
    price_inr: float
    price: float  # alias
    rating: Optional[float] = None
    distance_km: Optional[float] = 0.0
    travel_to_next_minutes: int = 0
    travel_to_next_distance_km: float = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    indoor_outdoor: Optional[str] = "Flexible"
    booking_required: bool = False


class SkippedExperience(BaseModel):
    """
    Details of experiences that could not be scheduled due to time, operating hours, or constraints.
    """
    experience_id: str
    name: str
    reason: str


class ItineraryGenerateResponse(BaseModel):
    """
    Structured response returned by POST /api/itinerary/generate
    """
    success: bool = True
    destination: str
    trip_date: str
    start_time: str
    end_time: str
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    start_location: Optional[str] = None
    total_duration_minutes: int
    total_duration_formatted: str
    total_experience_cost: float
    estimated_transport_cost: float
    total_cost: float
    budget: float
    budget_exceeded: bool = False
    budget_warning: Optional[str] = None
    scheduled_experiences: List[ScheduledExperience]
    itinerary: List[ScheduledExperience]  # alias for prompt format
    skipped_experiences: List[SkippedExperience] = []
    nugen: Optional[NugenEnhancementResponse] = None


class SaveItineraryRequest(BaseModel):
    """
    Payload for saving an itinerary into the database.
    """
    itinerary_id: Optional[str] = None
    destination: str
    trip_date: str
    start_time: str
    end_time: Optional[str] = None
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    start_location: Optional[str] = None
    total_duration_minutes: Optional[int] = 0
    total_cost: Optional[float] = 0.0
    total_experience_cost: Optional[float] = 0.0
    estimated_transport_cost: Optional[float] = 0.0
    traveler_count: Optional[int] = 1
    group_type: Optional[str] = "Solo"
    scheduled_experiences: List[Dict[str, Any]] = Field(default_factory=list)
    items: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None


class SaveItineraryResponse(BaseModel):
    """
    Response returned when an itinerary is saved into the database.
    """
    success: bool = True
    itinerary_id: str
    message: str = "Itinerary saved successfully"
    saved_at: str
    destination: str
    total_stops: int
    total_cost: float


class OptimizeItineraryRequest(BaseModel):
    """
    Payload for re-optimizing the route/sequence of an existing itinerary.
    """
    destination: Optional[str] = ""
    trip_date: str = "2026-09-26"
    start_time: str = "10:30 AM"
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    budget_inr: Optional[float] = 5000.0
    available_time_hours: Optional[float] = 6.0
    selected_experience_ids: List[str] = Field(default_factory=list)
    scheduled_experiences: Optional[List[Dict[str, Any]]] = None


class ItineraryChatOptimizeRequest(BaseModel):
    """
    Payload for conversational itinerary optimization & guide details using Groq AI (LocalLens Saathi).
    """
    prompt: str
    destination: Optional[str] = "Mumbai"
    current_interests: Optional[List[str]] = Field(default_factory=list)
    budget: Optional[float] = 5000.0
    duration_hours: Optional[float] = 6.0
    current_place_names: Optional[List[str]] = Field(default_factory=list)
    places_details: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class ItineraryChatOptimizeResponse(BaseModel):
    """
    Structured outcome returned by Groq AI optimizer & guide (LocalLens Saathi).
    """
    reply: str
    is_info_query: bool = False
    remove_interests: List[str] = Field(default_factory=list)
    add_interests: List[str] = Field(default_factory=list)
    custom_notes: Optional[str] = None
    updated_budget: Optional[float] = None
    updated_duration_hours: Optional[float] = None
    should_regenerate: bool = False
    is_route_reorder_only: bool = False


# ==============================================================================
# Master Prompt Section 10: Multi-Day Production Itinerary Pipeline Schemas
# ==============================================================================

class ItineraryCoordinates(BaseModel):
    lat: float
    lng: float


class DestinationInfo(BaseModel):
    name: str
    coordinates: ItineraryCoordinates


class ItineraryActivity(BaseModel):
    place_id: str
    name: str
    start_time: str
    end_time: str
    category: str
    sub_category: Optional[str] = None
    location: Optional[str] = None
    weather_rationale: str = "Weather suitable"
    coordinates: ItineraryCoordinates
    price_inr: float = 0.0
    duration_minutes: int = 60
    image_url: Optional[str] = None
    is_completed: bool = False


class ItineraryDaySchedule(BaseModel):
    day_number: int
    date: str
    weather_summary: Dict[str, Any] = Field(default_factory=dict)
    activities: List[ItineraryActivity] = Field(default_factory=list)


class ItineraryV1GenerateRequest(BaseModel):
    destination: str
    coordinates: Optional[ItineraryCoordinates] = None
    start_date: str = "2026-11-05"
    days: int = Field(default=1, ge=1, le=14)
    pace: str = Field(default="balanced", description="relaxed, balanced, fast-paced")
    traveler_type: str = Field(default="couple", description="solo, couple, friends, family")
    interests: List[str] = Field(default_factory=lambda: ["heritage", "food", "photography"])
    budget: Optional[Dict[str, Any]] = Field(default_factory=lambda: {"currency": "INR", "amount_per_person_per_day": 2500})
    selected_place_ids: Optional[List[str]] = Field(default_factory=list)
    weather_condition: Optional[str] = None


class ItineraryV1Response(BaseModel):
    itinerary_id: str
    destination: DestinationInfo
    start_date: str
    days: List[ItineraryDaySchedule]
    total_cost: float = 0.0
    total_duration_minutes: int = 360
    traveler_count: int = 1
    pace: str = "balanced"
    traveler_type: str = "couple"
    interests: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    nugen: Optional[NugenEnhancementResponse] = None
