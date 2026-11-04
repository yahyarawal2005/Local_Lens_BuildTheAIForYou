"""
Destination Experience and Place Management Service.
Coordinates with Supabase experience table, ML experience catalog, and quality validation.
"""
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import json
import logging
import os
import uuid
import pandas as pd

from backend.app.core.config import settings
from backend.app.schemas.experience_schemas import (
    ExperienceCreate,
    ExperienceListResponse,
    ExperienceResponse,
    ExperienceUpdate,
)
from backend.app.services.place_image_resolver import PlaceImageResolver
from backend.app.services.supabase_service import SupabaseService
from ml.experience_quality.validator import ExperienceValidator
from ml.recommendation.engine import haversine_km

logger = logging.getLogger(__name__)


class ExperienceService:
    """
    Complete CRUD, search, and geospatial querying service for destination experiences.
    """

    _validator = ExperienceValidator()

    @classmethod
    def _get_active_dataframe(cls) -> pd.DataFrame:
        """
        Retrieves normalized experience DataFrame from Supabase or local catalog.
        """
        from backend.app.services.recommendation_service import RecommendationService

        engine = RecommendationService.get_engine()
        df = engine.get_experiences_df()
        if df is None or df.empty:
            sb_df = SupabaseService.get_experience_dataframe()
            if sb_df is not None and not sb_df.empty:
                return sb_df
            return pd.DataFrame()
        return df

    @classmethod
    def _row_to_experience_response(cls, row: Dict[str, Any], dist_km: Optional[float] = None) -> ExperienceResponse:
        eid = str(row.get("experience_id") or row.get("id") or "")
        def _clean_str(val, default=None):
            if val is None or pd.isna(val) or str(val).strip() in ("", "nan", "None"):
                return default
            return str(val).strip()

        name = _clean_str(row.get("experience_name") or row.get("name"), "Local Experience")
        category = _clean_str(row.get("category"), "Local Experience")
        sub_category = _clean_str(row.get("sub_category"))
        city = _clean_str(row.get("city"), "Local")
        state = _clean_str(row.get("state"))
        country = _clean_str(row.get("country"), "India")
        location = _clean_str(row.get("location"), city)
        desc = _clean_str(row.get("description"))
        tags = row.get("tags") if isinstance(row.get("tags"), str) and row.get("tags") != "nan" else (", ".join(row.get("tags")) if isinstance(row.get("tags"), list) else None)
        w_suit = _clean_str(row.get("weather_suitability"))
        b_for = _clean_str(row.get("best_for"))
        op_hours = _clean_str(row.get("opening_hours"), "09:00 AM - 08:00 PM")


        try:
            lat = float(row["latitude"]) if pd.notna(row.get("latitude")) else None
        except Exception:
            lat = None

        try:
            lon = float(row["longitude"]) if pd.notna(row.get("longitude")) else None
        except Exception:
            lon = None

        try:
            raw_p = row.get("price_inr") if pd.notna(row.get("price_inr")) else row.get("price")
            price = float(raw_p) if pd.notna(raw_p) else 0.0
        except Exception:
            price = 0.0

        try:
            raw_d = row.get("duration_hours") if pd.notna(row.get("duration_hours")) else row.get("duration")
            dur = float(raw_d) if pd.notna(raw_d) else 1.0
        except Exception:
            dur = 1.0

        try:
            raw_dm = row.get("duration_minutes")
            dur_mins = int(float(raw_dm)) if pd.notna(raw_dm) else int(dur * 60)
        except Exception:
            dur_mins = int(dur * 60)

        try:
            rating = float(row["rating"]) if pd.notna(row.get("rating")) else 4.8
        except Exception:
            rating = 4.8

        try:
            raw_rc = row.get("review_count")
            reviews = int(float(raw_rc)) if pd.notna(raw_rc) else 120
        except Exception:
            reviews = 120

        raw_img = row.get("image_url") or row.get("image")
        if raw_img and str(raw_img).startswith("http"):
            clean_img = str(raw_img)
        else:
            try:
                resolver = PlaceImageResolver.get_instance()
                clean_img = resolver.resolve_image(place_id=eid, name=name, location=location, category=category)
            except Exception:
                clean_img = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80"

        return ExperienceResponse(
            experience_id=eid,
            id=eid,
            experience_name=name,
            category=category,
            sub_category=sub_category,
            city=city,
            state=state,
            country=country,
            location=location,
            latitude=lat,
            longitude=lon,
            description=desc,
            tags=tags,
            price_inr=price,
            currency="INR",
            duration_hours=dur,
            duration_minutes=dur_mins,
            rating=rating,
            review_count=reviews,
            image_url=clean_img,
            images=[clean_img] if clean_img else [],
            indoor_outdoor=str(row.get("indoor_outdoor") or "Flexible"),
            weather_suitability=w_suit,
            opening_hours=op_hours,
            best_for=b_for,
            local_experience=bool(row.get("local_experience", True)),
            hidden_gem=bool(row.get("hidden_gem", False)),
            booking_required=bool(row.get("booking_required", False)),
            source=str(row.get("source") or "verified_catalog"),
            verification_status="verified",
            distance_km=dist_km,
            score=float(row.get("recommendation_score") or row.get("score") or 0.9),
            created_at=str(row.get("created_at") or datetime.now().isoformat()),
            updated_at=str(row.get("updated_at") or datetime.now().isoformat()),
        )

    @classmethod
    def list_experiences(
        cls,
        destination: Optional[str] = None,
        category: Optional[str] = None,
        min_budget: Optional[float] = None,
        max_budget: Optional[float] = None,
        interests: Optional[List[str]] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        radius_km: Optional[float] = None,
        search_query: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> ExperienceListResponse:
        """
        Filters and retrieves experiences from the verified catalog.
        """
        df = cls._get_active_dataframe()
        if df.empty:
            return ExperienceListResponse(success=True, count=0, total=0, page=page, page_size=page_size, experiences=[])

        filtered = df.copy()

        # 1. Destination filter
        if destination:
            d_lower = destination.strip().lower()
            mask = filtered["city"].astype(str).str.lower().str.contains(d_lower)
            if "location" in filtered.columns:
                mask = mask | filtered["location"].astype(str).str.lower().str.contains(d_lower)
            if "district" in filtered.columns:
                mask = mask | filtered["district"].astype(str).str.lower().str.contains(d_lower)
            if "state" in filtered.columns:
                mask = mask | filtered["state"].astype(str).str.lower().str.contains(d_lower)
            filtered = filtered[mask]


        # 2. Category filter
        if category and category.lower() != "all":
            c_lower = category.strip().lower()
            mask = (
                filtered["category"].astype(str).str.lower().str.contains(c_lower)
                | filtered["sub_category"].astype(str).str.lower().str.contains(c_lower)
            )
            filtered = filtered[mask]

        # 3. Budget filter
        if min_budget is not None and "price_inr" in filtered.columns:
            filtered = filtered[filtered["price_inr"] >= min_budget]
        if max_budget is not None and "price_inr" in filtered.columns:
            filtered = filtered[filtered["price_inr"] <= max_budget]

        # 4. Search query filter
        if search_query:
            sq = search_query.strip().lower()
            s_mask = (
                filtered["experience_name"].astype(str).str.lower().str.contains(sq)
                | filtered["description"].astype(str).str.lower().str.contains(sq)
                | filtered["tags"].astype(str).str.lower().str.contains(sq)
            )
            filtered = filtered[s_mask]

        # 5. Radius filter
        dist_series: Optional[pd.Series] = None
        if lat is not None and lon is not None:
            if "latitude" in filtered.columns and "longitude" in filtered.columns:
                valid_coords = filtered[filtered["latitude"].notna() & filtered["longitude"].notna()].copy()
                valid_coords["_dist"] = haversine_km(
                    lat, lon,
                    valid_coords["latitude"].astype(float),
                    valid_coords["longitude"].astype(float)
                )
                if radius_km is not None and radius_km > 0:
                    valid_coords = valid_coords[valid_coords["_dist"] <= radius_km]
                filtered = valid_coords.sort_values(by="_dist")
                dist_series = filtered["_dist"]

        total = len(filtered)
        start_idx = (max(1, page) - 1) * page_size
        end_idx = start_idx + page_size
        page_df = filtered.iloc[start_idx:end_idx]

        results: List[ExperienceResponse] = []
        for idx, (_, row) in enumerate(page_df.iterrows()):
            dist_val = float(dist_series.iloc[start_idx + idx]) if dist_series is not None and len(dist_series) > (start_idx + idx) else None
            results.append(cls._row_to_experience_response(row.to_dict(), dist_km=dist_val))

        return ExperienceListResponse(
            success=True,
            count=len(results),
            total=total,
            page=page,
            page_size=page_size,
            experiences=results,
        )

    @classmethod
    def get_experience_by_id(cls, experience_id: str) -> Optional[ExperienceResponse]:
        """
        Retrieves a single experience by ID.
        """
        df = cls._get_active_dataframe()
        if df.empty:
            return None

        # Clean experience_id query
        eid_clean = str(experience_id).strip()
        candidates = df[
            (df["experience_id"].astype(str) == eid_clean)
            | (df["experience_id"].astype(str) == f"EXP-{eid_clean}")
            | (df["experience_id"].astype(str) == eid_clean.replace("EXP-", ""))
        ]
        if candidates.empty and "id" in df.columns:
            candidates = df[df["id"].astype(str) == eid_clean]

        if not candidates.empty:
            row = candidates.iloc[0].to_dict()
            return cls._row_to_experience_response(row)

        return None

    @classmethod
    def create_experience(cls, payload: ExperienceCreate, provider_id: Optional[str] = None) -> ExperienceResponse:
        """
        Creates a new experience listing with schema validation and persistence.
        """
        from backend.app.services.recommendation_service import RecommendationService

        sub_dict = payload.model_dump()

        # Image resolution: Ensure image exists before validation
        if not sub_dict.get("image_url"):
            try:
                resolver = PlaceImageResolver.get_instance()
                sub_dict["image_url"] = resolver.resolve_image(
                    name=payload.experience_name,
                    category=payload.category,
                    location=payload.location,
                )
            except Exception:
                sub_dict["image_url"] = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80"

        # Validate through quality validator
        cls._validator.validate_submission(sub_dict)

        new_id = f"EXP-{uuid.uuid4().hex[:8].upper()}"
        sub_dict["experience_id"] = new_id
        sub_dict["id"] = new_id
        sub_dict["provider_id"] = provider_id or "admin"
        sub_dict["created_at"] = datetime.now().isoformat()
        sub_dict["updated_at"] = datetime.now().isoformat()
        sub_dict["verification_status"] = "verified"


        # Try inserting to Supabase if configured
        url = settings.SUPABASE_URL.rstrip("/")
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        if url and key:
            try:
                import urllib.request
                endpoint = f"{url}/rest/v1/experience"
                headers = {
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation",
                }
                req_data = json.dumps(sub_dict).encode("utf-8")
                req = urllib.request.Request(endpoint, data=req_data, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=4) as resp:
                    if resp.status in (200, 201):
                        logger.info(f"Experience {new_id} persisted to Supabase experience table.")
            except Exception as e:
                logger.warning(f"Failed to persist experience to Supabase table directly: {e}")

        # Update in-memory engine DataFrame
        engine = RecommendationService.get_engine()
        if engine.experiences_df is not None and not engine.experiences_df.empty:
            new_row_df = pd.DataFrame([sub_dict])
            engine.experiences_df = pd.concat([engine.experiences_df, new_row_df], ignore_index=True)
            engine.experiences_df = engine.experiences_df.drop_duplicates(subset=["experience_id"], keep="last")

        return cls._row_to_experience_response(sub_dict)

    @classmethod
    def update_experience(cls, experience_id: str, updates: ExperienceUpdate) -> Optional[ExperienceResponse]:
        """
        Updates an existing experience listing.
        """
        from backend.app.services.recommendation_service import RecommendationService

        existing = cls.get_experience_by_id(experience_id)
        if not existing:
            return None

        update_data = updates.model_dump(exclude_unset=True)
        if not update_data:
            return existing

        update_data["updated_at"] = datetime.now().isoformat()

        # Update in-memory engine DataFrame
        engine = RecommendationService.get_engine()
        if engine.experiences_df is not None and not engine.experiences_df.empty:
            mask = (
                (engine.experiences_df["experience_id"].astype(str) == experience_id)
                | (engine.experiences_df["experience_id"].astype(str) == existing.experience_id)
            )
            for k, v in update_data.items():
                if k in engine.experiences_df.columns:
                    engine.experiences_df.loc[mask, k] = v

        # Return updated response
        merged = existing.model_dump()
        merged.update(update_data)
        return ExperienceResponse(**merged)

    @classmethod
    def delete_experience(cls, experience_id: str) -> bool:
        """
        Removes an experience listing.
        """
        from backend.app.services.recommendation_service import RecommendationService

        engine = RecommendationService.get_engine()
        if engine.experiences_df is not None and not engine.experiences_df.empty:
            initial_len = len(engine.experiences_df)
            mask = (
                (engine.experiences_df["experience_id"].astype(str) == experience_id)
                | (engine.experiences_df["experience_id"].astype(str) == f"EXP-{experience_id}")
            )
            engine.experiences_df = engine.experiences_df[~mask]
            return len(engine.experiences_df) < initial_len

        return True
