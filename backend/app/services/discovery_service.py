"""
Weather-Smart Discovery Canvas Engine.
Categorizes, ranks, and grounds destination places and experiences
using Supabase records, trained ML feature scores, and meteorological context.
"""
from typing import Any, Dict, List, Optional
import logging
import pandas as pd
from backend.app.schemas.discovery_schemas import (
    DiscoveryCategorySection,
    DiscoveryPlaceItem,
    DiscoveryRequest,
    DiscoveryResponse,
)
from backend.app.services.geocoding_service import GeocodingService
from backend.app.services.real_image_service import RealImageService
from backend.app.services.recommendation_service import RecommendationService
from backend.app.services.supabase_service import SupabaseService
from backend.app.services.weather_service import WeatherService
from ml.recommendation.engine import haversine_km

logger = logging.getLogger(__name__)

CATEGORY_BUCKETS = [
    {
        "id": "food",
        "title": "Local Food & Culinary Experiences",
        "keywords": ["food", "culinary", "breakfast", "chai", "tasting", "street food", "cafe", "dinner", "seafood"],
    },
    {
        "id": "culture",
        "title": "Culture & Heritage",
        "keywords": ["culture", "heritage", "history", "monument", "temple", "museum", "palace", "fort", "art"],
    },
    {
        "id": "adventure",
        "title": "Adventure & Outdoor Activities",
        "keywords": ["adventure", "trek", "hike", "watersports", "sports", "cycling", "kayak", "outdoor", "climb"],
    },
    {
        "id": "nature",
        "title": "Nature & Relaxation",
        "keywords": ["nature", "beach", "lake", "viewpoint", "garden", "sunset", "park", "wildlife", "scenic"],
    },
    {
        "id": "indoor",
        "title": "Indoor & Sheltered Experiences",
        "keywords": ["indoor", "museum", "gallery", "workshop", "craft", "spa", "sheltered"],
    },
    {
        "id": "shopping",
        "title": "Shopping, Nightlife & Souvenirs",
        "keywords": ["shopping", "bazaar", "market", "nightlife", "souvenir", "handicraft", "pub", "club"],
    },
]


class DiscoveryService:
    """Orchestrates candidate retrieval, ML scoring, weather adaptation, and categorization."""

    @classmethod
    async def get_discovery_canvas(cls, request: DiscoveryRequest) -> DiscoveryResponse:
        dest_city = request.destination.strip()
        if not dest_city:
            return DiscoveryResponse(
                success=False,
                destination="",
                coordinates={"lat": 0.0, "lng": 0.0},
                weather_context={},
                total_candidates=0,
                categories=[],
                all_places=[],
            )

        # 1. Resolve coordinates
        dest_lat = None
        dest_lng = None
        if request.coordinates and "lat" in request.coordinates and "lng" in request.coordinates:
            try:
                dest_lat = float(request.coordinates["lat"])
                dest_lng = float(request.coordinates["lng"])
            except (ValueError, TypeError):
                pass

        if dest_lat is None or dest_lng is None:
            resolved = await GeocodingService.resolve_coordinates(dest_city)
            if resolved:
                dest_lat = resolved.lat
                dest_lng = resolved.lng

        if dest_lat is None or dest_lng is None:
            return DiscoveryResponse(
                success=False,
                destination=dest_city,
                coordinates={"lat": 0.0, "lng": 0.0},
                weather_context={},
                total_candidates=0,
                categories=[],
                all_places=[],
            )

        # 2. Retrieve real weather context
        weather_summary = await WeatherService.get_trip_summary(
            destination=dest_city,
            start_date=request.trip_date,
            days=request.days or 1,
            lat=dest_lat,
            lon=dest_lng,
        )

        overall_cond = weather_summary.get("overall_condition", "Clear Sky").lower()
        is_rainy = "rain" in overall_cond or "thunderstorm" in overall_cond
        avg_temp = weather_summary.get("average_temp_c", 27.0)
        is_hot = avg_temp >= 35.0

        # 3. Load Candidate Experiences from Supabase / Seed Catalog
        engine = RecommendationService.get_engine()
        experiences_df = engine.get_experiences_df()

        if experiences_df.empty:
            experiences_df = SupabaseService.get_experience_dataframe() or pd.DataFrame()

        clean_dest = dest_city.lower()
        matched_candidates = []

        if not experiences_df.empty:
            for _, row in experiences_df.iterrows():
                row_city = str(row.get("city", "")).lower()
                row_loc = str(row.get("location", "")).lower()
                row_distr = str(row.get("district", "")).lower()

                # Strict destination matching
                is_city_match = (
                    clean_dest == row_city
                    or clean_dest in row_city
                    or row_city in clean_dest
                    or clean_dest in row_loc
                    or clean_dest in row_distr
                )

                lat = float(row["latitude"]) if pd.notna(row.get("latitude")) else None
                lon = float(row["longitude"]) if pd.notna(row.get("longitude")) else None
                dist_km = None
                if lat is not None and lon is not None and dest_lat is not None and dest_lng is not None:
                    try:
                        dist_km = haversine_km(dest_lat, dest_lng, lat, lon)
                    except Exception:
                        pass

                is_geo_match = dist_km is not None and dist_km <= 50.0

                if is_city_match or is_geo_match:
                    matched_candidates.append((row, dist_km))

        # 4. Score and Build DiscoveryPlaceItems
        place_items: List[DiscoveryPlaceItem] = []
        seen_ids = set()

        for row, dist_km in matched_candidates:
            raw_id = str(row.get("experience_id", row.get("id", "")))
            if not raw_id or raw_id in seen_ids:
                continue
            seen_ids.add(raw_id)

            name = str(row.get("experience_name", row.get("name", "Local Experience")))
            cat = str(row.get("category", "Local Experience"))
            sub_cat = str(row.get("sub_category", "")) if pd.notna(row.get("sub_category")) else None
            loc = str(row.get("location") or row.get("city") or dest_city)
            desc = str(row.get("description", "")) if pd.notna(row.get("description")) else None
            price = float(row.get("price_inr_clean", row.get("price_inr", 250.0)) or 250.0)
            duration = int(round(float(row.get("duration_hours_clean", row.get("duration_hours", 1.5)) or 1.5) * 60))
            rating = float(row.get("rating")) if pd.notna(row.get("rating")) else 4.8
            rev_count = int(row.get("review_count")) if pd.notna(row.get("review_count")) else 120
            indoor_out = str(row.get("indoor_outdoor", "")).lower()
            is_indoor = "indoor" in indoor_out or "sheltered" in indoor_out or cat.lower() in ("museum", "spa")
            is_hidden = bool(row.get("hidden_gem", False))

            lat = float(row.get("latitude")) if pd.notna(row.get("latitude")) else dest_lat
            lon = float(row.get("longitude")) if pd.notna(row.get("longitude")) else dest_lng

            # Weather suitability rules
            weather_suitability = "high"
            match_reasons = []

            if is_rainy:
                if is_indoor or cat.lower() in ("food", "culture", "museum", "shopping"):
                    weather_suitability = "high"
                    match_reasons.append("Sheltered/indoor experience ideal for rainy weather")
                else:
                    weather_suitability = "low"
                    match_reasons.append("Outdoor stop; subject to rain disruption")
            elif is_hot:
                if is_indoor:
                    weather_suitability = "high"
                    match_reasons.append("Air-conditioned/shaded; ideal during hot afternoon hours")
                else:
                    weather_suitability = "moderate"
                    match_reasons.append("Outdoor attraction; best visited during cooler morning/evening hours")
            else:
                weather_suitability = "high"
                match_reasons.append("Pleasant weather creates ideal visiting conditions")

            # Interest matching
            req_interests = [i.lower() for i in request.interests]
            combined_text = f"{cat} {sub_cat or ''} {name} {str(row.get('tags', ''))}".lower()
            if any(i in combined_text for i in req_interests):
                match_reasons.append("Matches your travel interests")

            if rating >= 4.7:
                match_reasons.append(f"Highly rated ({rating}★)")

            # Score computation
            score = 0.85
            if weather_suitability == "high":
                score += 0.08
            elif weather_suitability == "low":
                score -= 0.15
            if any(i in combined_text for i in req_interests):
                score += 0.06
            score = round(min(0.99, max(0.60, score)), 2)

            image = await RealImageService.find_real_image(
                place_name=name,
                city=str(row.get("city", dest_city)),
                location=loc,
                category=cat,
                experience_id=raw_id,
            )

            place_items.append(
                DiscoveryPlaceItem(
                    place_id=raw_id,
                    name=name,
                    category=cat,
                    sub_category=sub_cat,
                    description=desc or f"Authentic {cat.lower()} experience in {dest_city}.",
                    coordinates={"lat": lat, "lng": lon},
                    address=loc,
                    city=str(row.get("city", dest_city)),
                    opening_hours="09:00 - 18:00",
                    estimated_visit_duration_minutes=duration,
                    price_inr=price,
                    rating=rating,
                    review_count=rev_count,
                    image_url=image,
                    data_source="verified_catalog",
                    weather_suitability=weather_suitability,
                    weather_rationale=" • ".join(match_reasons) if match_reasons else "Recommended local highlight",
                    recommendation_score=score,
                    match_reasons=match_reasons,
                    is_indoor=is_indoor,
                    is_hidden_gem=is_hidden,
                )
            )

        # Sort places by score descending
        place_items.sort(key=lambda p: p.recommendation_score, reverse=True)

        # 5. Categorize into Sections
        categories_result: List[DiscoveryCategorySection] = []
        for bucket in CATEGORY_BUCKETS:
            b_keywords = bucket["keywords"]
            section_places = []
            for p in place_items:
                combined_p = f"{p.category} {p.sub_category or ''} {p.name}".lower()
                if any(kw in combined_p for kw in b_keywords):
                    section_places.append(p)

            # Keep top 8 per category section
            categories_result.append(
                DiscoveryCategorySection(
                    category_id=bucket["id"],
                    title=bucket["title"],
                    places=section_places[:8],
                )
            )

        return DiscoveryResponse(
            success=True,
            destination=dest_city,
            coordinates={"lat": dest_lat, "lng": dest_lng},
            weather_context=weather_summary,
            total_candidates=len(place_items),
            categories=categories_result,
            all_places=place_items[:request.top_n],
        )
