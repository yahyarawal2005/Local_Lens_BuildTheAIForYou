"""
Itineraries API Endpoints (V1 Multi-Day Pipeline & Ownership CRUD).
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from backend.app.core.security import get_current_user_id, get_optional_user_claims
from backend.app.schemas.itinerary_schemas import (
    ItineraryV1GenerateRequest,
    ItineraryV1Response,
)
from backend.app.services.itinerary_service import ItineraryService
from backend.app.services.nugen_service import NugenService
from backend.app.core.config import settings

router = APIRouter(prefix="/itineraries", tags=["Itineraries V1"])


@router.post("/generate", response_model=ItineraryV1Response)
async def generate_v1_itinerary(
    request: ItineraryV1GenerateRequest,
    claims: Optional[Dict[str, Any]] = Depends(get_optional_user_claims),
):
    """
    Generate a validated, multi-day, weather-smart itinerary.
    Binds the generated itinerary to the authenticated user ID if logged in.
    """
    user_id = str(claims.get("sub") or claims.get("id")) if claims else f"guest_user"
    response = await ItineraryService.generate_multiday_itinerary(request=request, user_id=user_id)

    # Optional Nugen AI enhancement layer
    if getattr(settings, "NUGEN_ENABLED", False):
        try:
            user_constraints = {
                "destination": request.destination,
                "days": request.days,
                "pace": request.pace,
                "traveler_type": request.traveler_type,
                "interests": request.interests,
            }
            nugen_data = await NugenService.enhance_itinerary(
                user_constraints=user_constraints,
                generated_itinerary=response.model_dump(),
            )
            if nugen_data:
                response.nugen = nugen_data
        except Exception:
            pass

    return response


@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]], include_in_schema=False)
async def list_user_itineraries(
    user_id: str = Depends(get_current_user_id),
):
    """
    Retrieve all itineraries created by the authenticated user.
    """
    return ItineraryService.get_user_itineraries(user_id=user_id)


@router.get("/{itinerary_id}", response_model=Dict[str, Any])
async def get_user_itinerary_by_id(
    itinerary_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Retrieve a specific itinerary by ID. Enforces ownership check.
    """
    itin = ItineraryService.get_user_itinerary(itinerary_id=itinerary_id, user_id=user_id)
    if not itin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Itinerary '{itinerary_id}' not found or access denied.",
        )
    return itin


@router.patch("/{itinerary_id}", response_model=Dict[str, Any])
async def update_user_itinerary(
    itinerary_id: str,
    updates: Dict[str, Any],
    user_id: str = Depends(get_current_user_id),
):
    """
    Update permitted fields on an existing itinerary owned by the authenticated user.
    """
    updated = ItineraryService.update_user_itinerary(itinerary_id=itinerary_id, user_id=user_id, updates=updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Itinerary '{itinerary_id}' not found or access denied.",
        )
    return updated


@router.delete("/{itinerary_id}")
async def delete_user_itinerary(
    itinerary_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Delete an itinerary owned by the authenticated user.
    """
    success = ItineraryService.delete_user_itinerary(itinerary_id=itinerary_id, user_id=user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Itinerary '{itinerary_id}' not found or access denied.",
        )
    return {"success": True, "message": f"Itinerary '{itinerary_id}' deleted successfully."}


@router.post("/{itinerary_id}/regenerate", response_model=ItineraryV1Response)
async def regenerate_itinerary(
    itinerary_id: str,
    day_number: Optional[int] = Query(None, description="Optional specific day number to regenerate"),
    user_id: str = Depends(get_current_user_id),
):
    """
    Regenerates an entire itinerary or a specific day with updated weather/candidates.
    """
    existing = ItineraryService.get_user_itinerary(itinerary_id=itinerary_id, user_id=user_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Itinerary '{itinerary_id}' not found or access denied.",
        )

    dest = existing.get("destination_name")
    if not dest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Itinerary record is missing a valid destination.",
        )

    # Re-run generator with same parameters
    req = ItineraryV1GenerateRequest(
        destination=dest,
        start_date=existing.get("start_date", "2026-11-05"),
        days=existing.get("days_count", 1),
        pace=existing.get("pace", "balanced"),
        traveler_type=existing.get("traveler_type", "solo"),
        interests=existing.get("interests", ["food", "culture"]),
    )
    new_itin = await ItineraryService.generate_multiday_itinerary(req, user_id=user_id)
    return new_itin


@router.post("/{itinerary_id}/days/{day_id}/regenerate", response_model=ItineraryV1Response)
async def regenerate_itinerary_day(
    itinerary_id: str,
    day_id: int,
    user_id: str = Depends(get_current_user_id),
):
    """
    Regenerates a specific day schedule within an existing itinerary.
    """
    return await regenerate_itinerary(itinerary_id=itinerary_id, day_number=day_id, user_id=user_id)

