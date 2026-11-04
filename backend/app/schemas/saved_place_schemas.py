"""
Saved Places Schemas.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SavedPlaceCreate(BaseModel):
    place_id: str
    place_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    notes: Optional[str] = None


class SavedPlaceResponse(BaseModel):
    id: str
    user_id: str
    place_id: str
    place_data: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = None
    created_at: Optional[str] = None


class SavedPlacesListResponse(BaseModel):
    success: bool = True
    count: int
    places: List[SavedPlaceResponse]
