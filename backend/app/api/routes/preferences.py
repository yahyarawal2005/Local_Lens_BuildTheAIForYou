"""
Traveler Preferences API Endpoints (V1).
Guarded by Supabase JWT verification; users can only view and update their own preferences.
"""
from fastapi import APIRouter, Depends
from backend.app.core.security import get_current_user_id
from backend.app.schemas.profile_schemas import TravelerPreferencesSchema
from backend.app.services.profile_service import ProfileService

router = APIRouter(prefix="/preferences", tags=["Preferences"])


@router.get("", response_model=TravelerPreferencesSchema)
@router.get("/", response_model=TravelerPreferencesSchema, include_in_schema=False)
async def get_my_preferences(
    user_id: str = Depends(get_current_user_id),
):
    """
    Retrieve saved traveler preferences for the authenticated user.
    """
    return ProfileService.get_preferences(user_id=user_id)


@router.put("", response_model=TravelerPreferencesSchema)
@router.put("/", response_model=TravelerPreferencesSchema, include_in_schema=False)
async def update_my_preferences(
    preferences: TravelerPreferencesSchema,
    user_id: str = Depends(get_current_user_id),
):
    """
    Save or replace traveler preferences for the authenticated user.
    """
    return ProfileService.update_preferences(user_id=user_id, prefs=preferences)
