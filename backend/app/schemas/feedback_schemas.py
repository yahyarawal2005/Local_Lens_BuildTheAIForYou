"""
Trip and Recommendation Feedback Schemas.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TripFeedbackCreate(BaseModel):
    itinerary_id: Optional[str] = None
    place_id: Optional[str] = None
    rating: int = Field(..., ge=1, le=5)
    feedback_type: str = Field(default="trip", description="trip, place, recommendation, weather")
    comments: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class TripFeedbackResponse(BaseModel):
    success: bool = True
    id: str
    user_id: str
    itinerary_id: Optional[str] = None
    place_id: Optional[str] = None
    rating: int
    feedback_type: str
    comments: Optional[str] = None
    created_at: Optional[str] = None
    message: str = "Feedback submitted successfully."


class FeedbackListResponse(BaseModel):
    success: bool = True
    count: int
    feedbacks: List[TripFeedbackResponse]
