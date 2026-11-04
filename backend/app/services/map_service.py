"""
Maps, Routing, and Geospatial Service.
Calculates road-aware transit routes, waypoints, and nearby place discovery.
"""
from typing import Any, Dict, List, Optional
import math
import logging

from backend.app.schemas.maps_schemas import (
    MapCoordinates,
    NearbyPlacesResponse,
    RouteRequest,
    RouteResponse,
    RouteSegment,
)
from backend.app.services.experience_service import ExperienceService
from ml.recommendation.engine import haversine_km

logger = logging.getLogger(__name__)

# Average urban transit speeds (km/h) and road circuity factors
MODE_CONFIG = {
    "driving": {"speed_kmh": 32.0, "circuity": 1.28, "base_penalty_mins": 3.0},
    "walking": {"speed_kmh": 4.8, "circuity": 1.15, "base_penalty_mins": 0.5},
    "bicycling": {"speed_kmh": 14.0, "circuity": 1.20, "base_penalty_mins": 1.0},
    "transit": {"speed_kmh": 22.0, "circuity": 1.30, "base_penalty_mins": 5.0},
}


class MapService:
    """
    Geospatial routing and map discovery service.
    """

    @classmethod
    def calculate_route(cls, request: RouteRequest) -> RouteResponse:
        """
        Calculates structured route segments and estimated road duration between waypoints.
        """
        mode = request.travel_mode.lower() if request.travel_mode else "driving"
        cfg = MODE_CONFIG.get(mode, MODE_CONFIG["driving"])

        # Compile ordered waypoints: origin -> [waypoints] -> destination
        ordered_points: List[MapCoordinates] = [request.origin]
        if request.waypoints:
            if request.optimize_waypoint_order and len(request.waypoints) > 1:
                # Greedy nearest neighbor ordering
                remaining = list(request.waypoints)
                curr = request.origin
                while remaining:
                    remaining.sort(
                        key=lambda p: haversine_km(curr.lat, curr.lng, p.lat, p.lng)
                    )
                    next_p = remaining.pop(0)
                    ordered_points.append(next_p)
                    curr = next_p
            else:
                ordered_points.extend(request.waypoints)
        ordered_points.append(request.destination)

        segments: List[RouteSegment] = []
        total_dist_km = 0.0
        total_dur_mins = 0.0
        polyline: List[List[float]] = []

        for i in range(len(ordered_points) - 1):
            p1 = ordered_points[i]
            p2 = ordered_points[i + 1]

            straight_dist = float(haversine_km(p1.lat, p1.lng, p2.lat, p2.lng))
            # Road network circuity
            road_dist = round(max(0.1, straight_dist * cfg["circuity"]), 2)
            # Duration in minutes: (dist / speed) * 60 + base intersection/traffic buffer
            dur_mins = round((road_dist / cfg["speed_kmh"]) * 60.0 + cfg["base_penalty_mins"], 1)

            total_dist_km += road_dist
            total_dur_mins += dur_mins

            from_title = p1.name or (f"Origin" if i == 0 else f"Stop {i}")
            to_title = p2.name or (f"Destination" if i == len(ordered_points) - 2 else f"Stop {i+1}")

            segments.append(
                RouteSegment(
                    from_name=from_title,
                    to_name=to_title,
                    from_coords=p1,
                    to_coords=p2,
                    distance_km=road_dist,
                    duration_minutes=dur_mins,
                    travel_mode=mode,
                    is_estimated=True,
                )
            )

            # Interpolate 5 coordinates along the route segment for smooth polyline display
            if i == 0:
                polyline.append([p1.lat, p1.lng])
            for step in range(1, 6):
                fraction = step / 5.0
                step_lat = round(p1.lat + (p2.lat - p1.lat) * fraction, 6)
                step_lng = round(p1.lng + (p2.lng - p1.lng) * fraction, 6)
                polyline.append([step_lat, step_lng])

        return RouteResponse(
            success=True,
            total_distance_km=round(total_dist_km, 2),
            total_duration_minutes=round(total_dur_mins, 1),
            travel_mode=mode,
            is_estimated=True,
            segments=segments,
            waypoints=ordered_points,
            polyline=polyline,
        )

    @classmethod
    def get_nearby_places(
        cls,
        lat: float,
        lng: float,
        radius_km: float = 15.0,
        category: Optional[str] = None,
        limit: int = 20,
    ) -> NearbyPlacesResponse:
        """
        Retrieves places and experiences near geographic coordinates.
        """
        exp_list = ExperienceService.list_experiences(
            category=category,
            lat=lat,
            lon=lng,
            radius_km=radius_km,
            page=1,
            page_size=limit,
        )

        places_payload = [e.model_dump() for e in exp_list.experiences]

        return NearbyPlacesResponse(
            success=True,
            center=MapCoordinates(lat=lat, lng=lng, name="Center"),
            radius_km=radius_km,
            count=len(places_payload),
            places=places_payload,
        )
