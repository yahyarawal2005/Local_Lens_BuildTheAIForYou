"""
Destination and Geocoding Schemas.
Consistent destination model matching Section 6 specification.
"""
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator


class Coordinates(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class DestinationSearchResult(BaseModel):
    name: str
    normalized_name: str
    display_name: str
    city: str
    state: Optional[str] = None
    country: str = "India"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    coordinates: Coordinates
    timezone: str = "Asia/Kolkata"
    confidence: float = 1.0
    source: str = "geocoder"
    provider: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None

    @model_validator(mode="after")
    def populate_lat_lng_and_provider(self):
        if self.latitude is None and self.coordinates:
            self.latitude = self.coordinates.lat
        if self.longitude is None and self.coordinates:
            self.longitude = self.coordinates.lng
        if self.provider is None:
            self.provider = self.source
        return self


class DestinationSearchResponse(BaseModel):
    success: bool = True
    query: str
    count: int
    results: List[DestinationSearchResult]


class DestinationDetailResponse(BaseModel):
    success: bool = True
    destination: DestinationSearchResult
