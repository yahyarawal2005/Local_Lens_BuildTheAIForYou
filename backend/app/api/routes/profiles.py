"""
Profile and Preferences API Endpoints.
Guarded by Supabase JWT verification; users can only view and mutate their own profile.
"""
from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from backend.app.core.security import get_current_user_claims, get_current_user_id
from backend.app.schemas.profile_schemas import (
    ProfileResponse,
    ProfileUpdateRequest,
    TravelerPreferencesSchema,
)
from backend.app.services.profile_service import ProfileService

router = APIRouter(prefix="/profiles", tags=["Profiles"])


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    user_id: str = Depends(get_current_user_id),
    claims: Dict[str, Any] = Depends(get_current_user_claims),
):
    """
    Retrieve authenticated user's profile.
    Automatically provisions profile on first login.
    """
    email = claims.get("email")
    metadata = claims.get("user_metadata", {})
    display_name = metadata.get("full_name") or metadata.get("name")
    photo_url = metadata.get("avatar_url") or metadata.get("picture")

    profile = ProfileService.get_or_create_profile(
        user_id=user_id,
        email=email,
        display_name=display_name,
        photo_url=photo_url,
    )
    return profile


@router.patch("/me", response_model=ProfileResponse)
async def update_my_profile(
    updates: ProfileUpdateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Update authenticated user's profile details.
    """
    return ProfileService.update_profile(user_id=user_id, updates=updates)


@router.get("/me/preferences", response_model=TravelerPreferencesSchema)
async def get_my_preferences(
    user_id: str = Depends(get_current_user_id),
):
    """
    Retrieve saved traveler preferences for the authenticated user.
    """
    return ProfileService.get_preferences(user_id=user_id)


@router.put("/me/preferences", response_model=TravelerPreferencesSchema)
async def update_my_preferences(
    preferences: TravelerPreferencesSchema,
    user_id: str = Depends(get_current_user_id),
):
    """
    Save or replace traveler preferences for the authenticated user.
    """
    return ProfileService.update_preferences(user_id=user_id, prefs=preferences)
