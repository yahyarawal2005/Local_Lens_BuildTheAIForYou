"""
Trip and Recommendation Feedback API Endpoints (V1).
Records and retrieves user feedback, ratings, and reviews.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from backend.app.core.security import get_optional_user_claims
from backend.app.schemas.feedback_schemas import (
    FeedbackListResponse,
    TripFeedbackCreate,
    TripFeedbackResponse,
)
from backend.app.services.feedback_service import FeedbackService

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", response_model=TripFeedbackResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=TripFeedbackResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def submit_feedback(
    payload: TripFeedbackCreate,
    claims: Optional[Dict[str, Any]] = Depends(get_optional_user_claims),
):
    """
    Submit feedback, ratings, and reviews for an itinerary or place recommendation.
    """
    user_id = str(claims.get("sub") or claims.get("id")) if claims else "anonymous_traveler"
    return FeedbackService.submit_feedback(user_id=user_id, payload=payload)


@router.get("", response_model=FeedbackListResponse)
@router.get("/", response_model=FeedbackListResponse, include_in_schema=False)
async def list_feedback(
    itinerary_id: Optional[str] = Query(None, description="Filter by itinerary ID"),
    place_id: Optional[str] = Query(None, description="Filter by place ID"),
    claims: Optional[Dict[str, Any]] = Depends(get_optional_user_claims),
):
    """
    Retrieve feedback entries submitted by users.
    """
    user_id = str(claims.get("sub") or claims.get("id")) if claims else None
    items = FeedbackService.list_feedback(user_id=user_id, itinerary_id=itinerary_id, place_id=place_id)
    return FeedbackListResponse(success=True, count=len(items), feedbacks=items)
