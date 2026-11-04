"""
Trip and Recommendation Feedback Service.
Records user ratings, trip reviews, and recommendation feedback for ranking enhancements.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
import json
import logging
import urllib.request
import uuid
from pathlib import Path
from backend.app.core.config import settings
from backend.app.schemas.feedback_schemas import (
    TripFeedbackCreate,
    TripFeedbackResponse,
)

logger = logging.getLogger(__name__)


class FeedbackService:
    """Handles feedback persistence with Supabase and local store fallback."""

    _db_file = Path(__file__).resolve().parent.parent / "data" / "trip_feedback.json"

    @classmethod
    def _ensure_file(cls):
        cls._db_file.parent.mkdir(parents=True, exist_ok=True)
        if not cls._db_file.exists():
            with open(cls._db_file, "w", encoding="utf-8") as f:
                json.dump([], f)

    @classmethod
    def _read_data(cls) -> List[Dict[str, Any]]:
        cls._ensure_file()
        try:
            with open(cls._db_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    @classmethod
    def _write_data(cls, data: List[Dict[str, Any]]):
        cls._ensure_file()
        with open(cls._db_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def submit_feedback(cls, user_id: str, payload: TripFeedbackCreate) -> TripFeedbackResponse:
        """Stores a feedback entry."""
        feed_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        record = {
            "id": feed_id,
            "user_id": user_id,
            "itinerary_id": payload.itinerary_id,
            "place_id": payload.place_id,
            "rating": payload.rating,
            "feedback_type": payload.feedback_type,
            "comments": payload.comments,
            "metadata": payload.metadata or {},
            "created_at": now,
        }

        all_records = cls._read_data()
        all_records.append(record)
        cls._write_data(all_records)

        # Sync to Supabase
        url = settings.SUPABASE_URL.rstrip("/")
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        if url and key:
            try:
                req = urllib.request.Request(
                    f"{url}/rest/v1/trip_feedback",
                    data=json.dumps(record).encode("utf-8"),
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal",
                    },
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=3):
                    pass
            except Exception as e:
                logger.debug(f"Supabase trip_feedback insert error: {e}")

        return TripFeedbackResponse(
            success=True,
            id=feed_id,
            user_id=user_id,
            itinerary_id=payload.itinerary_id,
            place_id=payload.place_id,
            rating=payload.rating,
            feedback_type=payload.feedback_type,
            comments=payload.comments,
            created_at=now,
            message="Feedback recorded successfully. Thank you for helping us improve LocalLens recommendations!",
        )

    @classmethod
    def list_feedback(
        cls,
        user_id: Optional[str] = None,
        itinerary_id: Optional[str] = None,
        place_id: Optional[str] = None,
    ) -> List[TripFeedbackResponse]:
        """Retrieves feedback matching the provided filters."""
        all_records = cls._read_data()
        results: List[TripFeedbackResponse] = []
        for r in all_records:
            if user_id and r.get("user_id") != user_id:
                continue
            if itinerary_id and r.get("itinerary_id") != itinerary_id:
                continue
            if place_id and r.get("place_id") != place_id:
                continue
            results.append(TripFeedbackResponse(
                success=True,
                id=str(r.get("id")),
                user_id=str(r.get("user_id")),
                itinerary_id=r.get("itinerary_id"),
                place_id=r.get("place_id"),
                rating=int(r.get("rating", 5)),
                feedback_type=str(r.get("feedback_type", "trip")),
                comments=r.get("comments"),
                created_at=r.get("created_at"),
                message="Feedback retrieved.",
            ))
        return results

