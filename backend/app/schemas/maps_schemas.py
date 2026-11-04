"""
Maps, Routing, and Distance Schemas.
Supports route requests, spatial optimization, nearby places, and GeoJSON coordinates.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MapCoordinates(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    name: Optional[str] = None


class RouteRequest(BaseModel):
    origin: MapCoordinates
    destination: MapCoordinates
    waypoints: Optional[List[MapCoordinates]] = None
    travel_mode: str = Field("driving", description="driving, walking, bicycling, or transit")
    optimize_waypoint_order: bool = False


class RouteSegment(BaseModel):
    from_name: str
    to_name: str
    from_coords: MapCoordinates
    to_coords: MapCoordinates
    distance_km: float
    duration_minutes: float
    travel_mode: str
    is_estimated: bool = True


class RouteResponse(BaseModel):
    success: bool = True
    total_distance_km: float
    total_duration_minutes: float
    travel_mode: str
    is_estimated: bool = True
    segments: List[RouteSegment]
    waypoints: List[MapCoordinates]
    polyline: Optional[List[List[float]]] = None


class NearbyPlacesResponse(BaseModel):
    success: bool = True
    center: MapCoordinates
    radius_km: float
    count: int
    places: List[Dict[str, Any]]
