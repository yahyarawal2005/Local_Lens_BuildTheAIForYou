"""
Recommendation Service (ML Pipeline).
Coordinates between ML recommendation model, Supabase experience catalog, and traveler preferences.

# ML recommendation system retained for future integration.
# Currently disconnected from the active recommendation pipeline.
"""
from pathlib import Path
from typing import Any, Dict, List, Optional
import logging
import os
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# ML recommendation system retained for future integration.
# Currently disconnected from the active recommendation pipeline.
from ml.recommendation.engine import RecommendationEngine
from backend.app.services.supabase_service import SupabaseService
try:
    from backend.app.schemas.recommendation_schemas import (
        RecommendationItem,
        RecommendationRequest,
        RecommendationResponse,
    )
    from backend.app.services.place_image_resolver import PlaceImageResolver
except ImportError:
    from app.schemas.recommendation_schemas import (
        RecommendationItem,
        RecommendationRequest,
        RecommendationResponse,
    )
    from app.services.place_image_resolver import PlaceImageResolver

import time
import pandas as pd

logger = logging.getLogger(__name__)


class RecommendationService:
    """
    Service layer for scoring and ranking personalized recommendations
    using the trained Random Forest ML model and Supabase Experience Database.
    """

    _engine_instance: Optional[RecommendationEngine] = None
    _last_sync_time: float = 0.0
    _sync_interval_seconds: float = 120.0

    @classmethod
    def sync_with_supabase(
        cls, engine: Optional[RecommendationEngine] = None, force: bool = False
    ) -> Dict[str, Any]:
        """
        Synchronize the in-memory ML candidate experiences DataFrame with live Supabase table records.
        Preserves existing base dataset while adding/updating new provider-submitted experiences.
        """
        if engine is None:
            engine = cls.get_engine()

        try:
            sb_df = SupabaseService.get_experience_dataframe(force_refresh=force)
            if sb_df is not None and not sb_df.empty:
                initial_count = len(engine.experiences_df) if engine.experiences_df is not None else 0
                
                # Merge Supabase experiences: replace or add based on experience_id
                if engine.experiences_df is not None and not engine.experiences_df.empty:
                    combined = pd.concat([engine.experiences_df, sb_df], ignore_index=True)
                    combined = combined.drop_duplicates(subset=["experience_id"], keep="last")
                    engine.experiences_df = combined
                else:
                    engine.experiences_df = sb_df.copy()

                cls._last_sync_time = time.time()
                current_count = len(engine.experiences_df)
                added_count = current_count - initial_count
                logger.info(
                    f"ML Engine synchronized with Supabase experience table: "
                    f"{len(sb_df)} fetched, total active experiences={current_count} (new={added_count})."
                )
                return {
                    "success": True,
                    "supabase_count": len(sb_df),
                    "total_active_experiences": current_count,
                    "new_provider_experiences": added_count,
                }
        except Exception as e:
            logger.warning(f"Failed to sync ML engine with Supabase: {e}")

        return {
            "success": False,
            "supabase_count": 0,
            "total_active_experiences": len(engine.experiences_df) if engine.experiences_df is not None else 0,
            "new_provider_experiences": 0,
        }

    @classmethod
    def get_engine(cls) -> RecommendationEngine:
        """Singleton accessor for the RecommendationEngine ML pipeline."""
        if cls._engine_instance is None:
            backend_dir = Path(__file__).resolve().parent.parent.parent
            workspace_root = backend_dir.parent
            ml_dir = workspace_root / "ml"

            model_dir = Path(os.getenv("MODEL_DIR", ml_dir / "models"))
            dataset_dir = Path(os.getenv("DATASET_DIR", ml_dir / "datasets"))

            logger.info(f"Initializing RecommendationEngine with all_experiences_with_photos.csv: model_dir={model_dir}, dataset_dir={dataset_dir}")
            cls._engine_instance = RecommendationEngine(
                model_dir=model_dir,
                dataset_dir=dataset_dir,
                dataset_filename="all_experiences_with_photos.csv",
            )
            # Sync with live Supabase database on initial boot
            cls.sync_with_supabase(cls._engine_instance)

        return cls._engine_instance

    @classmethod
    def get_recommendations(cls, request: RecommendationRequest) -> RecommendationResponse:
        """
        Score and rank candidate experiences for the traveler request using the notebook ML pipeline.
        """
        engine = cls.get_engine()

        # Check if periodic sync with Supabase is due (every 2 minutes)
        if time.time() - cls._last_sync_time > cls._sync_interval_seconds:
            try:
                cls.sync_with_supabase(engine, force=True)
            except Exception as e:
                logger.debug(f"Periodic Supabase sync failed: {e}")

        # Extract normalized fields
        budget_inr = float(request.budget_inr or 2500.0)
        available_time_hours = float(request.available_time_hours or 4.0)
        traveler_count = int(request.traveler_count)
        group_type = str(request.group_type or "Solo")
        interests = request.interests if request.interests else []

        # Resolve target city and coordinates
        city_filter = request.city if request.city else (request.destination if request.destination else None)
        user_lat = request.user_lat
        user_lon = request.user_lon

        # If user did not provide GPS coordinates, anchor to known city coordinates
        if (user_lat is None or user_lon is None) and city_filter:
            clean_city = str(city_filter).strip().lower()
            city_anchors = {
                "mumbai": (19.0760, 72.8777),
                "panvel": (18.9894, 73.1175),
                "navi mumbai": (19.0330, 73.0297),
                "delhi": (28.6139, 77.2090),
                "new delhi": (28.6139, 77.2090),
                "bangalore": (12.9716, 77.5946),
                "bengaluru": (12.9716, 77.5946),
                "goa": (15.2993, 74.1240),
                "jaipur": (26.9124, 75.7873),
                "hyderabad": (17.3850, 78.4867),
                "kolkata": (22.5726, 88.3639),
                "chennai": (13.0827, 80.2707),
                "pune": (18.5204, 73.8567),
                "agra": (27.1767, 78.0081),
                "varanasi": (25.3176, 82.9739),
            }
            for c_name, coords in city_anchors.items():
                if c_name in clean_city or clean_city in c_name:
                    user_lat, user_lon = coords
                    break

        # Map KM Area within which recommendations will be done based on time limit
        # For short time limits (e.g. 1-2 hours), restrict search to a tight reachable radius (6-10 km)
        # so traveler spends time experiencing instead of being stuck in transit!
        if request.radius_km is not None and request.radius_km > 0 and request.radius_km != 25.0:
            radius_km = float(request.radius_km)
        else:
            if available_time_hours <= 1.5:
                radius_km = 6.0
            elif available_time_hours <= 2.5:
                radius_km = 10.0
            elif available_time_hours <= 4.0:
                radius_km = 18.0
            elif available_time_hours <= 6.0:
                radius_km = 25.0
            else:
                radius_km = 35.0

        excluded_categories = request.excluded_categories

        results = engine.recommend(
            budget_inr=budget_inr,
            available_time_hours=available_time_hours,
            traveler_count=traveler_count,
            group_type=group_type,
            interests=interests,
            user_lat=user_lat,
            user_lon=user_lon,
            radius_km=radius_km,
            city=city_filter,
            category=request.category,
            excluded_categories=excluded_categories,
            top_n=request.top_n,
            apply_hard_filters=request.apply_hard_filters,
        )

        # Fallback 1: If tight time-bounded radius yielded fewer than 3 candidates, expand radius
        if len(results) < 3 and user_lat is not None and user_lon is not None:
            expanded_radius = min(radius_km * 2.0, 40.0)
            results = engine.recommend(
                budget_inr=budget_inr,
                available_time_hours=available_time_hours,
                traveler_count=traveler_count,
                group_type=group_type,
                interests=interests,
                user_lat=user_lat,
                user_lon=user_lon,
                radius_km=expanded_radius,
                city=city_filter,
                category=request.category,
                excluded_categories=excluded_categories,
                top_n=request.top_n,
                apply_hard_filters=False,
            )

        # Fallback if hard constraints eliminated all candidates
        if not results and request.apply_hard_filters:
            results = engine.recommend(
                budget_inr=budget_inr,
                available_time_hours=available_time_hours,
                traveler_count=traveler_count,
                group_type=group_type,
                interests=interests,
                user_lat=user_lat,
                user_lon=user_lon,
                radius_km=radius_km,
                city=None,
                category=request.category,
                excluded_categories=excluded_categories,
                top_n=request.top_n,
                apply_hard_filters=False,
            )

        # Fallback if no nearby results within radius_km: expand radius to 100km
        if not results and user_lat is not None and user_lon is not None:
            results = engine.recommend(
                budget_inr=budget_inr,
                available_time_hours=available_time_hours,
                traveler_count=traveler_count,
                group_type=group_type,
                interests=interests,
                user_lat=user_lat,
                user_lon=user_lon,
                radius_km=100.0,
                city=None,
                category=request.category,
                excluded_categories=excluded_categories,
                top_n=request.top_n,
                apply_hard_filters=False,
            )

        # Fallback to catalog-wide recommendation if still no results
        if not results:
            results = engine.recommend(
                budget_inr=budget_inr,
                available_time_hours=available_time_hours,
                traveler_count=traveler_count,
                group_type=group_type,
                interests=interests,
                user_lat=None,
                user_lon=None,
                radius_km=25.0,
                city=city_filter,
                category=request.category,
                excluded_categories=excluded_categories,
                top_n=request.top_n,
                apply_hard_filters=False,
            )

        # Fallback to catalog-wide matching interests if city filter matched 0 items
        if not results and city_filter is not None:
            results = engine.recommend(
                budget_inr=budget_inr,
                available_time_hours=available_time_hours,
                traveler_count=traveler_count,
                group_type=group_type,
                interests=interests,
                user_lat=None,
                user_lon=None,
                radius_km=25.0,
                city=None,
                category=request.category,
                excluded_categories=excluded_categories,
                top_n=request.top_n,
                apply_hard_filters=False,
            )

        # Format items with rich explanations and valid Supabase image URLs
        items: List[RecommendationItem] = []
        for r in results:
            item = cls._format_recommendation_item(r, request)
            items.append(item)

        return RecommendationResponse(
            success=True,
            count=len(items),
            recommendations=items,
        )

    @classmethod
    def _format_recommendation_item(
        cls,
        raw: Dict[str, Any],
        request: RecommendationRequest,
    ) -> RecommendationItem:
        """Format an ML candidate result into a clean API response item with personalized rationale."""
        score = float(raw.get("recommendation_score", 0.85))
        category = str(raw.get("category", "Local Experience"))
        sub_category = str(raw.get("sub_category", ""))
        price = float(raw.get("price_inr", 0.0))
        duration_hrs = float(raw.get("duration_hours", 1.5))
        duration_mins = int(round(duration_hrs * 60))
        rating = float(raw.get("rating")) if raw.get("rating") is not None else None
        is_hidden = bool(raw.get("hidden_gem", False))
        is_local = bool(raw.get("local_experience", True))
        overlap_count = int(raw.get("interest_overlap_count", 0))

        # Contextual explanation
        reason_parts = []
        if overlap_count > 0:
            reason_parts.append(f"Matches {overlap_count} of your selected interest{'s' if overlap_count > 1 else ''}")
        if is_hidden:
            reason_parts.append("Curated hidden gem with authentic local roots")
        elif is_local:
            reason_parts.append("Authentic host-led local experience")
        if rating and rating >= 4.5:
            reason_parts.append(f"Top-rated ({rating}★)")
        if request.budget_inr and price <= (request.budget_inr * 0.4):
            reason_parts.append("Great value within your budget")

        reason = " • ".join(reason_parts) if reason_parts else f"Recommended for {request.group_type or 'you'}"

        exp_id = str(raw.get("experience_id", ""))
        exp_name = str(raw.get("experience_name", "Local Experience"))

        loc_str = str(raw.get("location") or raw.get("city") or "")
        if raw.get("district") and str(raw.get("district")) != "nan" and str(raw.get("district")) != "None":
            loc_str = f"{raw.get('district')}, {loc_str}"

        # Resolve authentic CSV Image
        image_url = raw.get("image_url")
        if not image_url or not str(image_url).startswith("http") or "unsplash.com" in str(image_url).lower():
            resolved_csv_img = PlaceImageResolver.get_instance().resolve_image(
                place_id=exp_id,
                name=exp_name,
                location=loc_str,
                category=category,
            )
            image_url = resolved_csv_img or image_url

        # Parse tags
        raw_tags = raw.get("tags")
        tag_list: List[str] = []
        if isinstance(raw_tags, list):
            tag_list = [str(t).strip() for t in raw_tags if str(t).strip()]
        elif isinstance(raw_tags, str) and raw_tags.strip():
            tag_list = [t.strip() for t in raw_tags.split(";") if t.strip()]

        return RecommendationItem(
            experience_id=str(raw.get("experience_id", "")),
            experience_name=exp_name,
            name=exp_name,
            image_url=image_url,
            image=image_url,
            category=category,
            sub_category=sub_category if sub_category and sub_category != "nan" else None,
            location=loc_str,
            city=str(raw.get("city", "")),
            district=str(raw.get("district")) if raw.get("district") and str(raw.get("district")) != "nan" else None,
            state=str(raw.get("state")) if raw.get("state") and str(raw.get("state")) != "nan" else None,
            price_inr=price,
            price=price,
            duration_hours=duration_hrs,
            duration_minutes=duration_mins,
            rating=rating,
            review_count=int(raw.get("review_count")) if raw.get("review_count") is not None else None,
            distance_km=float(raw.get("distance_km")) if raw.get("distance_km") is not None else None,
            latitude=float(raw.get("latitude")) if raw.get("latitude") is not None and str(raw.get("latitude")) != "nan" else None,
            longitude=float(raw.get("longitude")) if raw.get("longitude") is not None and str(raw.get("longitude")) != "nan" else None,
            recommendation_score=round(score, 4),
            score=round(score, 4),
            reason=reason,
            tags=tag_list if tag_list else None,
            best_for=str(raw.get("best_for")) if raw.get("best_for") and str(raw.get("best_for")) != "nan" else None,
            local_experience=is_local,
            hidden_gem=is_hidden,
            indoor_outdoor=str(raw.get("indoor_outdoor", "Flexible")),
            booking_required=bool(raw.get("booking_required", False)),
        )
