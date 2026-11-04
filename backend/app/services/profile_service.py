"""
Profile and Traveler Preferences Service.
Manages user profiles and preference persistence with Supabase.
"""
from datetime import datetime
from typing import Any, Dict, Optional
import json
import logging
import os
import urllib.request
import urllib.error
from pathlib import Path

from backend.app.core.config import settings
from backend.app.schemas.profile_schemas import (
    ProfileResponse,
    ProfileUpdateRequest,
    TravelerPreferencesSchema,
)

logger = logging.getLogger(__name__)


class ProfileService:
    """Service handling profile and preference operations with Supabase / local persistence."""

    _local_profiles_file = Path(__file__).resolve().parent.parent / "data" / "user_profiles.json"
    _local_preferences_file = Path(__file__).resolve().parent.parent / "data" / "user_preferences.json"

    @classmethod
    def _ensure_data_files(cls):
        cls._local_profiles_file.parent.mkdir(parents=True, exist_ok=True)
        if not cls._local_profiles_file.exists():
            with open(cls._local_profiles_file, "w", encoding="utf-8") as f:
                json.dump({}, f)
        if not cls._local_preferences_file.exists():
            with open(cls._local_preferences_file, "w", encoding="utf-8") as f:
                json.dump({}, f)

    @classmethod
    def _read_local_profiles(cls) -> Dict[str, Any]:
        cls._ensure_data_files()
        try:
            with open(cls._local_profiles_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    @classmethod
    def _write_local_profiles(cls, data: Dict[str, Any]):
        cls._ensure_data_files()
        with open(cls._local_profiles_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def _read_local_preferences(cls) -> Dict[str, Any]:
        cls._ensure_data_files()
        try:
            with open(cls._local_preferences_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    @classmethod
    def _write_local_preferences(cls, data: Dict[str, Any]):
        cls._ensure_data_files()
        with open(cls._local_preferences_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def get_or_create_profile(
        cls,
        user_id: str,
        email: Optional[str] = None,
        display_name: Optional[str] = None,
        photo_url: Optional[str] = None,
    ) -> ProfileResponse:
        """
        Retrieves user profile, or automatically provisions one if absent.
        """
        # 1. Try fetching from Supabase
        url = settings.SUPABASE_URL.rstrip("/")
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY

        supabase_profile: Optional[Dict[str, Any]] = None
        if url and key:
            try:
                endpoint = f"{url}/rest/v1/profiles?id=eq.{user_id}&select=*"
                headers = {
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Accept": "application/json",
                }
                req = urllib.request.Request(endpoint, headers=headers)
                with urllib.request.urlopen(req, timeout=3) as resp:
                    if resp.status == 200:
                        rows = json.loads(resp.read().decode("utf-8"))
                        if rows:
                            supabase_profile = rows[0]
            except Exception as e:
                logger.debug(f"[ProfileService] Supabase profile fetch failed: {e}")

        # 2. Check local persistent store
        local_store = cls._read_local_profiles()
        profile_data = supabase_profile or local_store.get(user_id)

        if not profile_data:
            # Provision default profile
            now = datetime.now().isoformat()
            profile_data = {
                "id": user_id,
                "email": email or f"{user_id[:8]}@locallens.app",
                "display_name": display_name or (email.split("@")[0] if email else "Traveler"),
                "photo_url": photo_url or "https://lh3.googleusercontent.com/a/ACg8ocIq8x4d16wV9P-b2Wk?s=96-c",
                "role": "traveler",
                "traveler_type": "solo",
                "travel_pace": "balanced",
                "budget_preference": "moderate",
                "language": "en",
                "interests": ["Food", "Culture", "Local Experiences"],
                "accessibility": [],
                "created_at": now,
                "updated_at": now,
            }
            # Save locally
            local_store[user_id] = profile_data
            cls._write_local_profiles(local_store)

            # Attempt to persist to Supabase
            if url and key:
                try:
                    insert_req = urllib.request.Request(
                        f"{url}/rest/v1/profiles",
                        data=json.dumps(profile_data).encode("utf-8"),
                        headers={
                            "apikey": key,
                            "Authorization": f"Bearer {key}",
                            "Content-Type": "application/json",
                            "Prefer": "return=minimal",
                        },
                        method="POST",
                    )
                    with urllib.request.urlopen(insert_req, timeout=3):
                        logger.info(f"Successfully provisioned profile for user {user_id} in Supabase.")
                except Exception as sb_err:
                    logger.debug(f"[ProfileService] Could not insert profile to Supabase: {sb_err}")

        # Fetch preferences
        prefs = cls.get_preferences(user_id)

        return ProfileResponse(
            id=str(profile_data.get("id", user_id)),
            email=profile_data.get("email"),
            display_name=profile_data.get("display_name"),
            photo_url=profile_data.get("photo_url"),
            role=profile_data.get("role", "traveler"),
            traveler_type=profile_data.get("traveler_type", "solo"),
            travel_pace=profile_data.get("travel_pace", "balanced"),
            budget_preference=profile_data.get("budget_preference", "moderate"),
            language=profile_data.get("language", "en"),
            interests=profile_data.get("interests", ["Food", "Culture"]),
            accessibility=profile_data.get("accessibility", []),
            preferences=prefs,
        )

    @classmethod
    def update_profile(cls, user_id: str, updates: ProfileUpdateRequest) -> ProfileResponse:
        """Updates profile attributes for the authenticated user."""
        current = cls.get_or_create_profile(user_id)
        update_dict = updates.model_dump(exclude_unset=True)

        local_store = cls._read_local_profiles()
        user_record = local_store.get(user_id, current.model_dump())
        user_record.update(update_dict)
        user_record["updated_at"] = datetime.now().isoformat()
        local_store[user_id] = user_record
        cls._write_local_profiles(local_store)

        # Sync to Supabase
        url = settings.SUPABASE_URL.rstrip("/")
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        if url and key:
            try:
                patch_req = urllib.request.Request(
                    f"{url}/rest/v1/profiles?id=eq.{user_id}",
                    data=json.dumps(update_dict).encode("utf-8"),
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal",
                    },
                    method="PATCH",
                )
                with urllib.request.urlopen(patch_req, timeout=3):
                    pass
            except Exception as e:
                logger.debug(f"Failed to update Supabase profile: {e}")

        return cls.get_or_create_profile(user_id)

    @classmethod
    def get_preferences(cls, user_id: str) -> TravelerPreferencesSchema:
        """Retrieves traveler preferences for user."""
        local_prefs = cls._read_local_preferences()
        p = local_prefs.get(user_id)
        if p:
            return TravelerPreferencesSchema(**p)
        return TravelerPreferencesSchema()

    @classmethod
    def update_preferences(cls, user_id: str, prefs: TravelerPreferencesSchema) -> TravelerPreferencesSchema:
        """Upserts traveler preferences for user."""
        local_prefs = cls._read_local_preferences()
        data = prefs.model_dump()
        local_prefs[user_id] = data
        cls._write_local_preferences(local_prefs)

        url = settings.SUPABASE_URL.rstrip("/")
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        if url and key:
            try:
                upsert_payload = {**data, "user_id": user_id, "updated_at": datetime.now().isoformat()}
                req = urllib.request.Request(
                    f"{url}/rest/v1/traveler_preferences",
                    data=json.dumps(upsert_payload).encode("utf-8"),
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "Prefer": "resolution=merge-duplicates",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=3):
                    pass
            except Exception as e:
                logger.debug(f"Supabase preferences upsert error: {e}")

        return prefs
