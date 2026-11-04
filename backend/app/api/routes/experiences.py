"""
Experiences and Places API Endpoints (V1).
Provides listing, filtering, geospatial queries, and CRUD operations.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.core.security import get_current_user_id, get_optional_user_claims
from backend.app.schemas.experience_schemas import (
    ExperienceCreate,
    ExperienceListResponse,
    ExperienceResponse,
    ExperienceUpdate,
)
from backend.app.services.experience_service import ExperienceService

router = APIRouter(prefix="/experiences", tags=["Experiences"])


@router.get("", response_model=ExperienceListResponse)
@router.get("/", response_model=ExperienceListResponse, include_in_schema=False)
async def list_experiences(
    destination: Optional[str] = Query(None, description="Filter by destination or city"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_budget: Optional[float] = Query(None, ge=0.0, description="Minimum price in INR"),
    max_budget: Optional[float] = Query(None, ge=0.0, description="Maximum price in INR"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Anchor latitude"),
    lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Anchor longitude"),
    radius_km: Optional[float] = Query(None, ge=0.1, le=500.0, description="Radius in km"),
    q: Optional[str] = Query(None, description="Search keyword in title, tags, description"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """
    Search and filter verified destination places and experiences.
    """
    return ExperienceService.list_experiences(
        destination=destination,
        category=category,
        min_budget=min_budget,
        max_budget=max_budget,
        lat=lat,
        lon=lon,
        radius_km=radius_km,
        search_query=q,
        page=page,
        page_size=page_size,
    )


@router.get("/{experience_id}", response_model=ExperienceResponse)
async def get_experience_by_id(experience_id: str):
    """
    Retrieve full details for a single experience or place.
    """
    exp = ExperienceService.get_experience_by_id(experience_id)
    if not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experience '{experience_id}' not found.",
        )
    return exp


@router.post("", response_model=ExperienceResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=ExperienceResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_experience(
    payload: ExperienceCreate,
    user_id: str = Depends(get_current_user_id),
):
    """
    Register a new verified experience listing.
    """
    try:
        return ExperienceService.create_experience(payload, provider_id=user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create experience: {str(e)}",
        )


@router.patch("/{experience_id}", response_model=ExperienceResponse)
async def update_experience(
    experience_id: str,
    updates: ExperienceUpdate,
    user_id: str = Depends(get_current_user_id),
):
    """
    Update permitted fields on an existing experience.
    """
    updated = ExperienceService.update_experience(experience_id, updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experience '{experience_id}' not found.",
        )
    return updated


@router.delete("/{experience_id}")
async def delete_experience(
    experience_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Remove an experience from the catalog.
    """
    success = ExperienceService.delete_experience(experience_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Experience '{experience_id}' not found.",
        )
    return {"success": True, "message": f"Experience '{experience_id}' deleted successfully."}
