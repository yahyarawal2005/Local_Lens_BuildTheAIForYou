"""
Saved Places (Wishlist) API Endpoints.
Enforces ownership; users can only save, view, or delete their own saved places.
"""
from fastapi import APIRouter, Depends, status
from backend.app.core.security import get_current_user_id
from backend.app.schemas.saved_place_schemas import (
    SavedPlaceCreate,
    SavedPlaceResponse,
    SavedPlacesListResponse,
)
from backend.app.services.saved_places_service import SavedPlacesService

router = APIRouter(prefix="/saved-places", tags=["Saved Places"])


@router.post("", response_model=SavedPlaceResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SavedPlaceResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def save_place(
    payload: SavedPlaceCreate,
    user_id: str = Depends(get_current_user_id),
):
    """
    Bookmark a place or experience to the authenticated user's wishlist.
    """
    return SavedPlacesService.save_place(user_id=user_id, payload=payload)


@router.get("", response_model=SavedPlacesListResponse)
@router.get("/", response_model=SavedPlacesListResponse, include_in_schema=False)
async def list_saved_places(
    user_id: str = Depends(get_current_user_id),
):
    """
    Retrieve all places saved by the authenticated user.
    """
    return SavedPlacesService.list_saved_places(user_id=user_id)


@router.delete("/{place_id}")
async def remove_saved_place(
    place_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Remove a place from user's wishlist.
    """
    SavedPlacesService.remove_saved_place(user_id=user_id, place_id=place_id)
    return {"success": True, "message": f"Place '{place_id}' removed from wishlist."}
