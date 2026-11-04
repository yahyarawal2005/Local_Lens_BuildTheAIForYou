"""
Routing and Travel Time Service.
Provides clean service abstraction for distance and transit estimation between itinerary stops.
"""
from pathlib import Path
from typing import Any, Dict, Optional
import logging
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.preprocessing.features import calculate_haversine_distance

logger = logging.getLogger(__name__)


class RoutingService:
    """
    Service layer providing distance and estimated travel time calculations.
    Includes isolated fallback heuristic and clean interface for external routing providers.
    """

    @staticmethod
    def get_travel_time(
        origin_lat: Optional[float],
        origin_lon: Optional[float],
        dest_lat: Optional[float],
        dest_lon: Optional[float],
        avg_speed_kmh: float = 25.0,
    ) -> Dict[str, Any]:
        """
        Calculate realistic estimated transit time and distance between coordinates.
        
        Parameters:
          - origin_lat, origin_lon: Origin coordinates
          - dest_lat, dest_lon: Destination coordinates
          - avg_speed_kmh: Realistic urban transit speed (default 25 km/h)
          
        Returns:
          Dict with distance_km, duration_minutes, estimated_fare_inr
        """
        if (
            origin_lat is None
            or origin_lon is None
            or dest_lat is None
            or dest_lon is None
        ):
            # Default fallback when coordinates are missing
            return {
                "distance_km": 3.0,
                "duration_minutes": 15,
                "estimated_fare_inr": 80.0,
            }

        try:
            dist_km = float(
                calculate_haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)
            )
            dist_km = round(dist_km, 2)

            if dist_km < 0.3:
                # Walkable / adjacent stop
                transit_mins = 5
                fare = 0.0
            else:
                # Urban driving with 5-minute traffic/parking buffer
                raw_mins = (dist_km / avg_speed_kmh) * 60.0 + 5.0
                transit_mins = max(10, int(round(raw_mins)))
                # Realistic local ride fare (base ₹40 + ₹15/km)
                fare = round(40.0 + (dist_km * 15.0), 0)

            return {
                "distance_km": dist_km,
                "duration_minutes": transit_mins,
                "estimated_fare_inr": fare,
            }
        except Exception as e:
            logger.warning(f"Error computing routing travel time: {e}. Using fallback.")
            return {
                "distance_km": 3.0,
                "duration_minutes": 15,
                "estimated_fare_inr": 80.0,
            }
