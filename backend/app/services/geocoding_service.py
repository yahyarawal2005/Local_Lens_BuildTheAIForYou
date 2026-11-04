"""
Geocoding Service.
Resolves destination queries to validated geographic coordinates using real geocoding providers.
"""
from typing import Dict, List, Optional
import httpx
import logging
import urllib.parse
from backend.app.core.config import settings
from backend.app.schemas.destination_schemas import Coordinates, DestinationSearchResult
from backend.app.services.weather_service import CITY_COORDINATES

logger = logging.getLogger(__name__)

# In-memory LRU cache for geocoding queries
_GEOCODE_CACHE: Dict[str, List[DestinationSearchResult]] = {}


class GeocodingService:
    """Provides destination resolution, geocoding, and coordinate normalization."""

    @classmethod
    async def search_destination(cls, query: str) -> List[DestinationSearchResult]:
        """
        Resolves destination search string to one or more matched results.
        Checks known anchors first, then uses OpenStreetMap Nominatim / Geocoding provider.
        """
        clean_q = query.strip()
        if not clean_q:
            return []

        cache_key = clean_q.lower()
        if cache_key in _GEOCODE_CACHE:
            return _GEOCODE_CACHE[cache_key]

        results: List[DestinationSearchResult] = []

        # 1. Exact or partial match in canonical destinations dictionary
        for city_key, coords in CITY_COORDINATES.items():
            if city_key == cache_key or city_key in cache_key or cache_key in city_key:
                city_name = city_key.title()
                results.append(
                    DestinationSearchResult(
                        name=f"{city_name}, India",
                        normalized_name=city_name,
                        display_name=f"{city_name}, India",
                        city=city_name,
                        state="India",
                        country="India",
                        coordinates=Coordinates(lat=coords[0], lng=coords[1]),
                        timezone="Asia/Kolkata",
                        confidence=0.98,
                        source="canonical_index",
                    )
                )

        # 2. Query OpenStreetMap Nominatim
        encoded_q = urllib.parse.quote(clean_q)
        url = f"https://nominatim.openstreetmap.org/search?q={encoded_q}&format=json&addressdetails=1&limit=5"
        headers = {
            "User-Agent": "LocalLens-TravelerWeb/1.0 (contact@locallens.app)",
            "Accept-Language": "en",
        }

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data:
                        try:
                            lat = float(item["lat"])
                            lon = float(item["lon"])
                            display_name = item.get("display_name", clean_q)
                            addr = item.get("address", {})
                            city = (
                                addr.get("city")
                                or addr.get("town")
                                or addr.get("village")
                                or addr.get("state_district")
                                or clean_q.split(",")[0].strip()
                            )
                            state = addr.get("state")
                            country = addr.get("country", "India")

                            # Avoid duplicate coordinate matches
                            if not any(
                                abs(r.coordinates.lat - lat) < 0.05 and abs(r.coordinates.lng - lon) < 0.05
                                for r in results
                            ):
                                results.append(
                                    DestinationSearchResult(
                                        name=display_name.split(",")[0],
                                        normalized_name=city,
                                        display_name=display_name,
                                        city=city,
                                        state=state,
                                        country=country,
                                        coordinates=Coordinates(lat=lat, lng=lon),
                                        timezone="Asia/Kolkata",
                                        confidence=float(item.get("importance", 0.8)),
                                        source="nominatim",
                                    )
                                )
                        except (KeyError, ValueError):
                            continue
        except Exception as e:
            logger.debug(f"[GeocodingService] Nominatim query failed: {e}")

        _GEOCODE_CACHE[cache_key] = results
        return results

    @classmethod
    async def resolve_coordinates(cls, destination: str) -> Optional[Coordinates]:
        """Returns single best Coordinates for destination name."""
        results = await cls.search_destination(destination)
        if results:
            return results[0].coordinates
        return None

    @classmethod
    async def get_destination_by_id(cls, destination_id: str) -> Optional[DestinationSearchResult]:
        """Returns destination details for destination name, slug, or ID."""
        clean_id = destination_id.strip()
        if not clean_id:
            return None
        results = await cls.search_destination(clean_id)
        if results:
            return results[0]
        return None

