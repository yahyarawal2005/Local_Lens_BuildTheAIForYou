"""
Saved Places (Wishlist) Service.
Manages user bookmarks, saved places, and wishlist synchronization.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
import json
import logging
import urllib.request
from pathlib import Path
from backend.app.core.config import settings
from backend.app.schemas.saved_place_schemas import (
    SavedPlaceCreate,
    SavedPlaceResponse,
    SavedPlacesListResponse,
)

logger = logging.getLogger(__name__)


class SavedPlacesService:
    """Handles saved places persistence with Supabase and local store fallback."""

    _db_file = Path(__file__).resolve().parent.parent / "data" / "saved_places.json"

    @classmethod
    def _ensure_file(cls):
        cls._db_file.parent.mkdir(parents=True, exist_ok=True)
        if not cls._db_file.exists():
            with open(cls._db_file, "w", encoding="utf-8") as f:
                json.dump({}, f)

    @classmethod
    def _read_data(cls) -> Dict[str, List[Dict[str, Any]]]:
        cls._ensure_file()
        try:
            with open(cls._db_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    @classmethod
    def _write_data(cls, data: Dict[str, List[Dict[str, Any]]]):
        cls._ensure_file()
        with open(cls._db_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def save_place(cls, user_id: str, payload: SavedPlaceCreate) -> SavedPlaceResponse:
        """Saves a place to user's wishlist."""
        import uuid
        now = datetime.now().isoformat()
        item_id = str(uuid.uuid4())
        record = {
            "id": item_id,
            "user_id": user_id,
            "place_id": payload.place_id,
            "place_data": payload.place_data or {},
            "notes": payload.notes,
            "created_at": now,
        }

        all_data = cls._read_data()
        user_list = all_data.get(user_id, [])

        # Avoid duplicates
        existing = next((p for p in user_list if p.get("place_id") == payload.place_id), None)
        if existing:
            existing.update(record)
            record = existing
        else:
            user_list.append(record)

        all_data[user_id] = user_list
        cls._write_data(all_data)

        # Sync to Supabase
        url = settings.SUPABASE_URL.rstrip("/")
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        if url and key:
            try:
                sb_payload = {
                    "user_id": user_id,
                    "place_id": payload.place_id,
                    "place_data": payload.place_data or {},
                    "notes": payload.notes,
                }
                req = urllib.request.Request(
                    f"{url}/rest/v1/saved_places",
                    data=json.dumps(sb_payload).encode("utf-8"),
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
                logger.debug(f"Supabase saved_places insert error: {e}")

        return SavedPlaceResponse(**record)

    @classmethod
    def list_saved_places(cls, user_id: str) -> SavedPlacesListResponse:
        """Returns list of places saved by the user."""
        all_data = cls._read_data()
        user_list = all_data.get(user_id, [])
        items = [SavedPlaceResponse(**p) for p in user_list]
        return SavedPlacesListResponse(
            success=True,
            count=len(items),
            places=items,
        )

    @classmethod
    def remove_saved_place(cls, user_id: str, place_id: str) -> bool:
        """Removes a place from user's wishlist."""
        all_data = cls._read_data()
        user_list = all_data.get(user_id, [])
        updated = [p for p in user_list if p.get("place_id") != place_id]
        all_data[user_id] = updated
        cls._write_data(all_data)

        # Sync delete to Supabase
        url = settings.SUPABASE_URL.rstrip("/")
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        if url and key:
            try:
                req = urllib.request.Request(
                    f"{url}/rest/v1/saved_places?user_id=eq.{user_id}&place_id=eq.{place_id}",
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                    },
                    method="DELETE",
                )
                with urllib.request.urlopen(req, timeout=3):
                    pass
            except Exception as e:
                logger.debug(f"Supabase saved_places delete error: {e}")

        return True
