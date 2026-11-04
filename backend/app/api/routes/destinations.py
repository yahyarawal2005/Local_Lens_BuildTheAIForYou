"""
Destination Search and Geocoding API Endpoints (V1).
Provides destination search, geocoding normalization, and destination details.
"""
from fastapi import APIRouter, HTTPException, Query, status
from backend.app.schemas.destination_schemas import (
    DestinationDetailResponse,
    DestinationSearchResponse,
    DestinationSearchResult,
)
from backend.app.services.geocoding_service import GeocodingService

router = APIRouter(prefix="/destinations", tags=["Destinations"])


@router.get("/search", response_model=DestinationSearchResponse)
async def search_destinations(
    q: str = Query(..., min_length=2, description="Destination search query, e.g. 'Jaipur' or 'Mumbai'"),
):
    """
    Search and normalize destination locations into validated geographic coordinates.
    """
    results = await GeocodingService.search_destination(q)
    return DestinationSearchResponse(
        success=True,
        query=q,
        count=len(results),
        results=results,
    )


@router.get("/{destination_id}", response_model=DestinationDetailResponse)
async def get_destination_by_id(destination_id: str):
    """
    Retrieve normalized location details for a specific destination by name, slug, or ID.
    """
    dest = await GeocodingService.get_destination_by_id(destination_id)
    if not dest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Destination '{destination_id}' not found.",
        )
    return DestinationDetailResponse(success=True, destination=dest)
