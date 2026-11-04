"""
Maps, Routes, and Nearby Places API Endpoints (V1).
Provides road-aware route calculation and nearby place queries.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.maps_schemas import (
    NearbyPlacesResponse,
    RouteRequest,
    RouteResponse,
)
from backend.app.services.map_service import MapService

router = APIRouter(prefix="/maps", tags=["Maps"])


@router.post("/route", response_model=RouteResponse)
async def calculate_route(request: RouteRequest):
    """
    Calculate travel route, distance, and duration between origin and destination waypoints.
    Uses realistic urban speed and road circuity heuristics.
    """
    try:
        return MapService.calculate_route(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to calculate route: {str(e)}",
        )


@router.get("/nearby", response_model=NearbyPlacesResponse)
async def get_nearby_places(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Center latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Center longitude"),
    radius_km: float = Query(15.0, ge=0.5, le=100.0, description="Search radius in kilometers"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    limit: int = Query(20, ge=1, le=50, description="Maximum places to return"),
):
    """
    Retrieve verified places and experiences within a radius of given coordinates.
    """
    return MapService.get_nearby_places(
        lat=lat,
        lng=lon,
        radius_km=radius_km,
        category=category,
        limit=limit,
    )
