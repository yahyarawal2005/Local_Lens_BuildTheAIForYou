"""
Gemini Recommendation Service.
Primary recommendation engine for LocalLens.
Analyzes traveler preferences, Supabase experience context, and trip-date weather.
Discovers verified real images and returns normalized RecommendationResponse for the existing UI.
"""
from datetime import datetime
import json
import logging
import math
import os
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx
import pandas as pd

try:
    from backend.app.core.config import settings
    from backend.app.data.curated_destination_experiences import CURATED_DESTINATION_EXPERIENCES
    from backend.app.schemas.recommendation_schemas import (
        ParsedTravelIntent,
        RecommendationItem,
        RecommendationRequest,
        RecommendationResponse,
        SmartSearchRequest,
        SmartSearchResponse,
    )
    from backend.app.services.real_image_service import RealImageService
    from backend.app.services.supabase_service import SupabaseService
    from backend.app.services.weather_service import WeatherService
    from backend.app.services.place_image_resolver import PlaceImageResolver
except ImportError:
    from app.core.config import settings
    from app.data.curated_destination_experiences import CURATED_DESTINATION_EXPERIENCES
    from app.schemas.recommendation_schemas import (
        ParsedTravelIntent,
        RecommendationItem,
        RecommendationRequest,
        RecommendationResponse,
        SmartSearchRequest,
        SmartSearchResponse,
    )
    from app.services.real_image_service import RealImageService
    from app.services.supabase_service import SupabaseService
    from app.services.weather_service import WeatherService
    from app.services.place_image_resolver import PlaceImageResolver

logger = logging.getLogger("locallens.gemini_recommendation")

GEMINI_SYSTEM_INSTRUCTION = """You are the AI Recommendation Engine for LocalLens, a personalized travel platform.
Your task is to analyze traveler requirements, the destination city, Supabase experience database records, and weather forecast for the trip date, then recommend and rank the best experiences.

HARD CONSTRAINTS & RULES:
1. DESTINATION IS SINGLE SOURCE OF TRUTH: Use the provided trip destination as the destination of the trip. Do not substitute the user's current device location. Do not recommend places merely because they are close to the user's current GPS location. All recommendations must be geographically relevant to the requested destination.
2. MUST NOT INVENT EXPERIENCES: Recommend ONLY experiences present in the provided "supabase_experiences" list. Keep the exact "experience_id" and details intact. Never invent IDs, prices, or ratings.
3. WEATHER-AWARE ADAPTATION:
   - Heavy Rain / Thunderstorm: Prioritize indoor attractions, museums, cafes, food walks, covered markets, indoor cultural workshops. Avoid beaches, trekking, hiking, open viewpoints, water sports.
   - Sunny / Clear: Prioritize outdoor experiences, beaches, nature, heritage walks, outdoor viewpoints, adventure.
   - Light Rain / Drizzle: Prefer covered experiences, short walks, indoor-outdoor flexible stops.
   - Cloudy / Moderate: Balanced reasoning.
   - Weather Unavailable: Do NOT assume or pretend weather exists. Recommend based on user interests, time, budget, group type, and location.
4. BUDGET RESPECT: Recommend experiences that fit within the user's total budget.
5. AVAILABLE TIME RESPECT: Experiences should reasonably fit within the user's available hours.
6. GROUP FIT: Tailor reasons and selections for Solo, Couple, Friends, or Family.
7. PERSONALIZED REASON: For every recommended experience, write a concise, compelling 1-2 sentence reason explaining why it fits their interests, group type, and the weather at the destination.
8. SCORING: Assign a recommendation_score between 0.70 and 0.99 reflecting match quality.
9. RETURN STRICT JSON: Output only valid JSON matching the schema below.

OUTPUT JSON SCHEMA:
{
  "weather_summary": {
    "condition": "string",
    "temperature_c": 25.0,
    "rain_probability": 80,
    "outdoor_suitability": "high | moderate | low | unknown"
  },
  "weather_advice": "1 sentence advice regarding trip date weather at destination",
  "recommendations": [
    {
      "experience_id": "EXP-123",
      "recommendation_score": 0.95,
      "reason": "Personalized reason explaining why this fits interests and destination weather",
      "weather_suitability": "high | moderate | low",
      "image_query_hint": "Real place search query for image lookup (e.g. Amber Palace Jaipur)"
    }
  ]
}
"""


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


class GeminiRecommendationService:
    """
    Active recommendation engine driven by Gemini AI and Supabase Context.
    Replaces ML model in the live recommendation flow while preserving exact API schemas.
    """

    @classmethod
    def get_api_key(cls) -> str:
        return (
            os.getenv("GEMINI_API_KEY")
            or getattr(settings, "GEMINI_API_KEY", "")
            or os.getenv("LLM_API_KEY")
            or getattr(settings, "LLM_API_KEY", "")
        ).strip()

    @classmethod
    def get_model_name(cls) -> str:
        return (
            os.getenv("GEMINI_MODEL")
            or getattr(settings, "GEMINI_MODEL", "")
            or "gemini-1.5-flash"
        ).strip()

    @classmethod
    def resolve_destination(cls, request: RecommendationRequest) -> Tuple[str, Optional[float], Optional[float]]:
        """
        Resolves trip destination text and coordinates.
        Destination is the single source of truth for weather, Supabase queries, and Gemini recommendations.
        """
        dest_city = (
            request.destination
            or request.destination_city
            or request.city
            or ""
        ).strip()

        # Resolve destination coordinates
        dest_lat = request.destination_lat
        dest_lon = request.destination_lon

        if (dest_lat is None or dest_lon is None) and dest_city:
            dest_coords = WeatherService.get_coordinates_for_destination(dest_city)
            if dest_coords:
                dest_lat, dest_lon = dest_coords
            elif request.user_lat is not None and request.user_lon is not None and not request.destination:
                dest_lat, dest_lon = request.user_lat, request.user_lon

        return dest_city, dest_lat, dest_lon

    @classmethod
    async def get_recommendations(cls, request: RecommendationRequest) -> RecommendationResponse:
        """
        Main recommendation flow:
        1. Resolve destination city & coordinates (Single Source of Truth).
        2. Fetch Supabase experiences context filtered by destination.
        3. Fetch weather forecast for destination and trip date.
        4. Form structured Gemini request with destination context.
        5. Invoke Gemini API for reasoning and ranking.
        6. Discover authentic real images for recommended places.
        7. Return normalized RecommendationResponse matching frontend expectations.
        """
        # Step 1: Destination Resolution
        dest_city, dest_lat, dest_lon = cls.resolve_destination(request)
        logger.info(f"[BACKEND DESTINATION] City: {dest_city}, Lat: {dest_lat}, Lng: {dest_lon}")

        # Step 2: Retrieve Supabase experiences
        candidates_df = cls._fetch_candidate_experiences(request, dest_city=dest_city)
        if candidates_df.empty:
            logger.warning("[GeminiRec] No candidate experiences available from Supabase.")
            return RecommendationResponse(success=True, count=0, recommendations=[])

        # Step 3: Fetch weather for DESTINATION and trip date
        weather_info = await WeatherService.get_weather_for_trip(
            lat=dest_lat,
            lon=dest_lon,
            destination=dest_city,
            trip_date=request.trip_date,
            override_condition=request.weather_condition,
        )

        # Step 4: Build AI LLM request payload with destination context
        gemini_api_key = cls.get_api_key()
        groq_api_key = (
            os.getenv("GROQ_API_KEY")
            or getattr(settings, "GROQ_API_KEY", "")
        ).strip()
        model_name = cls.get_model_name()

        # Extract top relevant context records for AI prompt (up to 40 items)
        context_records = cls._prepare_supabase_context(
            candidates_df, request, dest_city=dest_city, dest_lat=dest_lat, dest_lon=dest_lon
        )
        logger.info(f"[SUPABASE CONTEXT] Destination: {dest_city}, Experiences Found: {len(context_records)}")

        ai_result = None
        if gemini_api_key:
            try:
                logger.info(f"[GEMINI REQUEST] Destination: {dest_city}")
                ai_result = await cls._call_gemini_api(
                    api_key=gemini_api_key,
                    model_name=model_name,
                    request=request,
                    dest_city=dest_city,
                    dest_lat=dest_lat,
                    dest_lon=dest_lon,
                    weather_info=weather_info,
                    experiences_context=context_records,
                )
            except Exception as e:
                logger.error(f"[GeminiRec] Gemini API execution failed: {e}. Checking fallback LLM...", exc_info=True)

        if not ai_result and groq_api_key:
            try:
                logger.info(f"[GEMINI REQUEST] (Groq Fallback) Destination: {dest_city}")
                ai_result = await cls._call_groq_api(
                    api_key=groq_api_key,
                    request=request,
                    dest_city=dest_city,
                    dest_lat=dest_lat,
                    dest_lon=dest_lon,
                    weather_info=weather_info,
                    experiences_context=context_records,
                )
            except Exception as e:
                logger.error(f"[GeminiRec] Groq LLM execution failed: {e}.", exc_info=True)

        # Step 5: Parse recommendations or use robust fallback
        recommended_items: List[RecommendationItem] = []
        if ai_result and ai_result.get("recommendations"):
            recommended_items = await cls._build_items_from_gemini(
                gemini_recs=ai_result["recommendations"],
                candidates_df=candidates_df,
                request=request,
                dest_city=dest_city,
                dest_lat=dest_lat,
                dest_lon=dest_lon,
                weather_info=weather_info,
            )

        # Step 6: If LLM produced 0 results or was offline, execute trained Random Forest ML model
        if not recommended_items:
            try:
                from backend.app.services.recommendation_service import RecommendationService
                logger.info(f"[RecOrchestrator] Executing trained RandomForest ML Model for {dest_city}...")
                ml_resp = RecommendationService.get_recommendations(request)
                if ml_resp and ml_resp.recommendations:
                    recommended_items = ml_resp.recommendations
                    logger.info(f"[RecOrchestrator] Successfully inferred {len(recommended_items)} recommendations via RandomForest ML pipeline.")
            except Exception as e:
                logger.warning(f"[RecOrchestrator] ML engine execution fallback: {e}")

        # Step 6b: If ML model also produced 0 results, use rule-based fallback ranking
        if not recommended_items:
            logger.info(f"[RecOrchestrator] Using rule-based ranking for {dest_city} with real image resolver.")
            recommended_items = await cls._build_fallback_recommendations(
                candidates_df=candidates_df,
                request=request,
                dest_city=dest_city,
                dest_lat=dest_lat,
                dest_lon=dest_lon,
                weather_info=weather_info,
            )


        # Step 7: Limit to top_n
        final_items = recommended_items[:request.top_n]
        logger.info(f"[FINAL RECOMMENDATIONS] Destination: {dest_city}, Count: {len(final_items)}")

        return RecommendationResponse(
            success=True,
            count=len(final_items),
            recommendations=final_items,
        )

    @classmethod
    def _fetch_candidate_experiences(cls, request: RecommendationRequest, dest_city: str = "Mumbai") -> pd.DataFrame:
        """
        Pulls experience records from Supabase / Seed catalog and merges curated multi-city destination catalog.
        """
        # Try fetching from Supabase table first
        df = SupabaseService.get_experience_dataframe()
        if df is None or df.empty:
            # Fallback to seed / CSV dataset if Supabase network is unavailable
            csv_path = PlaceImageResolver.get_instance()._find_csv_path()
            if csv_path and csv_path.exists():
                try:
                    df = pd.read_csv(csv_path)
                    df = SupabaseService._normalize_supabase_dataframe(df)
                except Exception as e:
                    logger.error(f"[GeminiRec] Error loading fallback CSV dataset: {e}")
                    df = pd.DataFrame()
            else:
                df = pd.DataFrame()

        # Merge curated multi-destination catalog (Jaipur, Goa, Bengaluru, Pune, Nashik, etc.)
        curated_df = pd.DataFrame(CURATED_DESTINATION_EXPERIENCES)
        if not curated_df.empty:
            if df.empty:
                df = curated_df
            else:
                existing_ids = set(df["experience_id"].astype(str)) if "experience_id" in df.columns else set()
                new_curated = curated_df[~curated_df["experience_id"].astype(str).isin(existing_ids)]
                if not new_curated.empty:
                    df = pd.concat([df, new_curated], ignore_index=True)

        if df.empty:
            return df

        # Apply category exclusions if specified
        excluded = request.excluded_categories
        if excluded:
            ex_list = [str(x).strip().lower() for x in (excluded if isinstance(excluded, list) else [excluded]) if x]
            if ex_list:
                df = df[~df["category"].astype(str).str.lower().isin(ex_list)]

        # Specific single category filter
        if request.category and request.category.strip():
            req_cat = request.category.strip().lower()
            df = df[df["category"].astype(str).str.lower() == req_cat]

        return df

    @classmethod
    def _prepare_supabase_context(
        cls,
        df: pd.DataFrame,
        request: RecommendationRequest,
        dest_city: str = "Mumbai",
        dest_lat: float = 19.0760,
        dest_lon: float = 72.8777,
        limit: int = 40,
    ) -> List[Dict[str, Any]]:
        """
        Selects and formats the most relevant candidate experience records for the Gemini prompt.
        Prioritizes experiences matching the trip destination and coordinates.
        """
        target_city = dest_city.strip().lower()

        filtered_df = df.copy()

        # Score relevance for pre-selection based on DESTINATION
        def calculate_relevance(row: pd.Series) -> float:
            score = 0.0
            row_city = str(row.get("city", "")).lower()
            row_district = str(row.get("district", "")).lower()
            row_loc = str(row.get("location", "")).lower()

            # Destination City match (Primary priority)
            if target_city:
                if target_city in row_city or target_city in row_district or target_city in row_loc:
                    score += 100.0
                elif row_city in target_city or row_district in target_city:
                    score += 80.0

            # Distance calculation relative to DESTINATION center coordinates
            r_lat = row.get("latitude")
            r_lon = row.get("longitude")
            if dest_lat is not None and dest_lon is not None and pd.notna(r_lat) and pd.notna(r_lon):
                try:
                    dist = _haversine_distance(float(dest_lat), float(dest_lon), float(r_lat), float(r_lon))
                    if dist <= 50.0:
                        score += max(0.0, 50.0 - dist)
                except Exception:
                    pass

            # Interests overlap
            req_interests = [str(i).strip().lower() for i in (request.interests if isinstance(request.interests, list) else [request.interests]) if i]
            row_cat = str(row.get("category", "")).lower()
            row_sub = str(row.get("sub_category", "")).lower()
            row_tags = str(row.get("tags", "")).lower()
            for interest in req_interests:
                if interest in row_cat or interest in row_sub or interest in row_tags:
                    score += 20.0

            # Rating boost
            rating = row.get("rating")
            if pd.notna(rating):
                try:
                    score += float(rating) * 2.0
                except Exception:
                    pass

            return score

        filtered_df["_relevance"] = filtered_df.apply(calculate_relevance, axis=1)
        sorted_df = filtered_df.sort_values(by="_relevance", ascending=False).head(limit)

        records: List[Dict[str, Any]] = []
        for _, row in sorted_df.iterrows():
            exp_id = str(row.get("experience_id", row.get("id", ""))).strip()
            if not exp_id:
                continue

            raw_tags = row.get("tags")
            tags_list = []
            if isinstance(raw_tags, list):
                tags_list = raw_tags
            elif isinstance(raw_tags, str) and raw_tags.strip():
                tags_list = [t.strip() for t in raw_tags.replace(";", ",").split(",") if t.strip()]

            records.append({
                "id": exp_id,
                "name": str(row.get("experience_name", row.get("name", "Local Experience"))),
                "description": str(row.get("description", ""))[:200],
                "category": str(row.get("category", "Local Experience")),
                "sub_category": str(row.get("sub_category", "")) if pd.notna(row.get("sub_category")) else None,
                "location": str(row.get("location", row.get("city", ""))),
                "city": str(row.get("city", "")),
                "district": str(row.get("district", "")) if pd.notna(row.get("district")) else None,
                "price_inr": float(row.get("price_inr", 0.0)),
                "duration_hours": float(row.get("duration_hours", 1.5)),
                "rating": float(row.get("rating")) if pd.notna(row.get("rating")) else None,
                "review_count": int(row.get("review_count")) if pd.notna(row.get("review_count")) else None,
                "latitude": float(row.get("latitude")) if pd.notna(row.get("latitude")) else None,
                "longitude": float(row.get("longitude")) if pd.notna(row.get("longitude")) else None,
                "indoor_outdoor": str(row.get("indoor_outdoor", "Flexible")),
                "tags": tags_list[:5],
                "best_for": str(row.get("best_for", "")) if pd.notna(row.get("best_for")) else None,
                "local_experience": bool(row.get("local_experience", True)),
                "hidden_gem": bool(row.get("hidden_gem", False)),
            })

        return records

    @classmethod
    async def _call_gemini_api(
        cls,
        api_key: str,
        model_name: str,
        request: RecommendationRequest,
        dest_city: str,
        dest_lat: float,
        dest_lon: float,
        weather_info: Dict[str, Any],
        experiences_context: List[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """
        Executes the Gemini API call with structured JSON prompt and destination context.
        """
        user_payload = {
            "trip_destination": {
                "city": dest_city,
                "latitude": dest_lat,
                "longitude": dest_lon,
            },
            "trip_date": request.trip_date or "today",
            "traveler_preferences": {
                "available_time_hours": request.available_time_hours,
                "budget_inr": request.budget_inr,
                "traveler_count": request.traveler_count,
                "group_type": request.group_type,
                "interests": request.interests if isinstance(request.interests, list) else [request.interests],
                "accessibility": request.accessibility or [],
                "additional_preferences": request.additional_preferences or {},
            },
            "weather": {
                "status": weather_info.get("status", "available"),
                "condition": weather_info.get("condition"),
                "temperature_c": weather_info.get("temperature_c"),
                "rain_probability": weather_info.get("rain_probability"),
                "precipitation_mm": weather_info.get("precipitation_mm"),
                "humidity_pct": weather_info.get("humidity_pct"),
                "wind_speed_kmh": weather_info.get("wind_speed_kmh"),
                "trip_date": weather_info.get("trip_date"),
                "destination": dest_city,
            },
            "supabase_experiences": experiences_context,
        }

        prompt_text = (
            f"Analyze the destination ({dest_city}), traveler preferences, trip-date destination weather forecast, and Supabase candidate experiences below.\n"
            f"Select the top suitable experiences for {dest_city}, rank them, provide personalized weather-aware reasons, and output JSON.\n\n"
            f"{json.dumps(user_payload, indent=2)}"
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt_text}]}],
            "systemInstruction": {"parts": [{"text": GEMINI_SYSTEM_INSTRUCTION}]},
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    cleaned_json = cls._clean_json_markdown(raw_text)
                    parsed = json.loads(cleaned_json)
                    logger.info(f"[GeminiRec] Successfully received {len(parsed.get('recommendations', []))} recommendations from Gemini ({model_name}) for {dest_city}.")
                    return parsed
            else:
                logger.warning(f"[GeminiRec] Gemini API returned status {resp.status_code}: {resp.text[:300]}")

        return None

    @classmethod
    async def _call_groq_api(
        cls,
        api_key: str,
        request: RecommendationRequest,
        dest_city: str,
        dest_lat: float,
        dest_lon: float,
        weather_info: Dict[str, Any],
        experiences_context: List[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """
        Executes Groq Llama-3.1-8b API call with JSON mode when Gemini key is absent or limited.
        """
        user_payload = {
            "trip_destination": {
                "city": dest_city,
                "latitude": dest_lat,
                "longitude": dest_lon,
            },
            "trip_date": request.trip_date or "today",
            "traveler_preferences": {
                "available_time_hours": request.available_time_hours,
                "budget_inr": request.budget_inr,
                "traveler_count": request.traveler_count,
                "group_type": request.group_type,
                "interests": request.interests if isinstance(request.interests, list) else [request.interests],
                "accessibility": request.accessibility or [],
                "additional_preferences": request.additional_preferences or {},
            },
            "weather": {
                "status": weather_info.get("status", "available"),
                "condition": weather_info.get("condition"),
                "temperature_c": weather_info.get("temperature_c"),
                "rain_probability": weather_info.get("rain_probability"),
                "precipitation_mm": weather_info.get("precipitation_mm"),
                "humidity_pct": weather_info.get("humidity_pct"),
                "wind_speed_kmh": weather_info.get("wind_speed_kmh"),
                "trip_date": weather_info.get("trip_date"),
                "destination": dest_city,
            },
            "supabase_experiences": experiences_context,
        }

        prompt_text = (
            f"Analyze the destination ({dest_city}), traveler preferences, trip-date destination weather forecast, and Supabase candidate experiences:\n"
            f"{json.dumps(user_payload, indent=2)}\n\n"
            f"Return JSON matching the schema strictly with top ranked recommendations for {dest_city}, scores (0.7-0.99), and personalized reasons."
        )

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        candidate_models = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"]

        for model_name in candidate_models:
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": GEMINI_SYSTEM_INSTRUCTION},
                    {"role": "user", "content": prompt_text},
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            }

            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        cleaned_json = cls._clean_json_markdown(raw_text)
                        parsed = json.loads(cleaned_json)
                        logger.info(f"[GeminiRec] Successfully received {len(parsed.get('recommendations', []))} recommendations from Groq ({model_name}) for {dest_city}.")
                        return parsed
                    elif resp.status_code in (400, 404):
                        continue
                    else:
                        logger.warning(f"[GeminiRec] Groq API returned status {resp.status_code}: {resp.text[:300]}")
                        break
            except Exception as e:
                logger.warning(f"[GeminiRec] Groq call with model {model_name} error: {e}")
                continue

        return None

    @classmethod
    def _clean_json_markdown(cls, text: str) -> str:
        """Strips markdown code blocks from JSON string."""
        s = text.strip()
        if s.startswith("```"):
            lines = s.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            s = "\n".join(lines).strip()
        return s

    @classmethod
    async def _build_items_from_gemini(
        cls,
        gemini_recs: List[Dict[str, Any]],
        candidates_df: pd.DataFrame,
        request: RecommendationRequest,
        dest_city: str,
        dest_lat: float,
        dest_lon: float,
        weather_info: Dict[str, Any],
    ) -> List[RecommendationItem]:
        """
        Maps Gemini recommendation results to database records and retrieves verified real images.
        """
        items: List[RecommendationItem] = []
        id_to_row = {}
        for _, row in candidates_df.iterrows():
            eid = str(row.get("experience_id", row.get("id", ""))).strip().upper()
            if eid:
                id_to_row[eid] = row
                clean_eid = eid.replace("EXP-", "")
                id_to_row[clean_eid] = row
                id_to_row[f"EXP-{clean_eid}"] = row

        for rec in gemini_recs:
            exp_id_raw = str(rec.get("experience_id", "")).strip().upper()
            row = id_to_row.get(exp_id_raw)
            if row is None:
                # Try finding by partial ID match
                for key, val in id_to_row.items():
                    if exp_id_raw in key or key in exp_id_raw:
                        row = val
                        break

            if row is None:
                continue

            exp_id = str(row.get("experience_id", row.get("id", exp_id_raw)))
            exp_name = str(row.get("experience_name", row.get("name", "Local Experience")))
            category = str(row.get("category", "Local Experience"))
            sub_category = str(row.get("sub_category", "")) if pd.notna(row.get("sub_category")) else None
            city = str(row.get("city", dest_city))
            district = str(row.get("district", "")) if pd.notna(row.get("district")) else None
            state = str(row.get("state", "")) if pd.notna(row.get("state")) else None
            location_str = str(row.get("location") or row.get("city") or dest_city)
            if district and str(district) not in ("nan", "None"):
                location_str = f"{district}, {location_str}"

            price = float(row.get("price_inr", 0.0))
            duration_hrs = float(row.get("duration_hours", 1.5))
            duration_mins = int(round(duration_hrs * 60))
            rating = float(row.get("rating")) if pd.notna(row.get("rating")) else None
            review_count = int(row.get("review_count")) if pd.notna(row.get("review_count")) else None
            lat = float(row.get("latitude")) if pd.notna(row.get("latitude")) else dest_lat
            lon = float(row.get("longitude")) if pd.notna(row.get("longitude")) else dest_lon

            # Calculate distance relative to destination anchor
            dist_km = None
            if dest_lat is not None and dest_lon is not None and lat is not None and lon is not None:
                try:
                    dist_km = _haversine_distance(dest_lat, dest_lon, lat, lon)
                except Exception:
                    pass

            # Score & reason from Gemini
            score = float(rec.get("recommendation_score", 0.90))
            reason = str(rec.get("reason") or f"Recommended for {request.group_type or 'you'} in {dest_city}")

            # Discover real image for the place with destination context
            image_hint = rec.get("image_query_hint")
            real_image = await RealImageService.find_real_image(
                place_name=exp_name,
                city=city,
                location=location_str,
                category=category,
                experience_id=exp_id,
                gemini_image_hint=image_hint,
            )

            # Parse tags
            raw_tags = row.get("tags")
            tags_list = []
            if isinstance(raw_tags, list):
                tags_list = [str(t).strip() for t in raw_tags if str(t).strip()]
            elif isinstance(raw_tags, str) and raw_tags.strip():
                tags_list = [t.strip() for t in raw_tags.replace(";", ",").split(",") if t.strip()]

            item = RecommendationItem(
                experience_id=exp_id,
                experience_name=exp_name,
                name=exp_name,
                image_url=real_image,
                image=real_image,
                category=category,
                sub_category=sub_category if sub_category and str(sub_category) != "nan" else None,
                location=location_str,
                city=city,
                district=district if district and str(district) != "nan" else None,
                state=state if state and str(state) != "nan" else None,
                price_inr=price,
                price=price,
                duration_hours=duration_hrs,
                duration_minutes=duration_mins,
                rating=rating,
                review_count=review_count,
                distance_km=dist_km,
                latitude=lat,
                longitude=lon,
                recommendation_score=round(score, 4),
                score=round(score, 4),
                reason=reason,
                tags=tags_list if tags_list else None,
                best_for=str(row.get("best_for")) if pd.notna(row.get("best_for")) and str(row.get("best_for")) != "nan" else None,
                local_experience=bool(row.get("local_experience", True)),
                hidden_gem=bool(row.get("hidden_gem", False)),
                indoor_outdoor=str(row.get("indoor_outdoor", "Flexible")),
                booking_required=bool(row.get("booking_required", False)),
            )
            items.append(item)

        return items

    @classmethod
    async def _build_fallback_recommendations(
        cls,
        candidates_df: pd.DataFrame,
        request: RecommendationRequest,
        dest_city: str,
        dest_lat: float,
        dest_lon: float,
        weather_info: Dict[str, Any],
    ) -> List[RecommendationItem]:
        """
        Graceful fallback ranking algorithm if Gemini API is offline.
        Uses rule-based scoring without calling ML models.
        """
        w_cond = str(weather_info.get("condition") or "").lower()
        is_rainy = "rain" in w_cond or "thunderstorm" in w_cond or "drizzle" in w_cond

        target_city = dest_city.strip().lower()

        def score_fallback(row: pd.Series) -> float:
            score = 0.70
            cat = str(row.get("category", "")).lower()
            indoor_out = str(row.get("indoor_outdoor", "Flexible")).lower()

            # City/destination alignment (mandatory requirement)
            if target_city:
                row_city = str(row.get("city", "")).lower()
                row_dist = str(row.get("district", "")).lower()
                row_loc = str(row.get("location", "")).lower()
                is_city_match = (
                    target_city == row_city
                    or target_city in row_city
                    or row_city in target_city
                    or target_city in row_dist
                    or row_dist in target_city
                    or target_city in row_loc
                    or row_loc in target_city
                )

                r_lat = row.get("latitude")
                r_lon = row.get("longitude")
                is_geo_match = False
                if dest_lat is not None and dest_lon is not None and pd.notna(r_lat) and pd.notna(r_lon):
                    try:
                        d = _haversine_distance(float(dest_lat), float(dest_lon), float(r_lat), float(r_lon))
                        if d <= 50.0:
                            is_geo_match = True
                            score += max(0.0, (50.0 - d) / 100.0)
                    except Exception:
                        pass

                if not is_city_match and not is_geo_match:
                    return 0.0  # Strictly exclude places from other destinations

                if is_city_match:
                    score += 0.35

            # Weather suitability
            if is_rainy:
                if "indoor" in indoor_out or cat in ("food", "museum", "culture", "shopping"):
                    score += 0.15
                elif "outdoor" in indoor_out or cat in ("beach", "adventure", "nature"):
                    score -= 0.20
            else:
                if "outdoor" in indoor_out or cat in ("beach", "adventure", "nature"):
                    score += 0.10

            # Interests overlap
            req_interests = [str(i).strip().lower() for i in (request.interests if isinstance(request.interests, list) else [request.interests]) if i]
            for interest in req_interests:
                if interest in cat or interest in str(row.get("tags", "")).lower():
                    score += 0.08

            # Rating boost
            rating = row.get("rating")
            if pd.notna(rating):
                score += (float(rating) - 4.0) * 0.03

            return min(0.99, max(0.50, score))

        candidates_df = candidates_df.copy()
        candidates_df["_score"] = candidates_df.apply(score_fallback, axis=1)
        sorted_df = candidates_df[candidates_df["_score"] > 0].sort_values(by="_score", ascending=False).head(request.top_n)

        items: List[RecommendationItem] = []
        for _, row in sorted_df.iterrows():
            exp_id = str(row.get("experience_id", row.get("id", "")))
            exp_name = str(row.get("experience_name", row.get("name", "Local Experience")))
            category = str(row.get("category", "Local Experience"))
            sub_category = str(row.get("sub_category", "")) if pd.notna(row.get("sub_category")) else None
            city = str(row.get("city", dest_city))
            district = str(row.get("district", "")) if pd.notna(row.get("district")) else None
            state = str(row.get("state", "")) if pd.notna(row.get("state")) else None
            location_str = str(row.get("location") or row.get("city") or dest_city)
            if district and str(district) not in ("nan", "None"):
                location_str = f"{district}, {location_str}"

            price = float(row.get("price_inr", 0.0))
            duration_hrs = float(row.get("duration_hours", 1.5))
            duration_mins = int(round(duration_hrs * 60))
            rating = float(row.get("rating")) if pd.notna(row.get("rating")) else None
            review_count = int(row.get("review_count")) if pd.notna(row.get("review_count")) else None
            lat = float(row.get("latitude")) if pd.notna(row.get("latitude")) else dest_lat
            lon = float(row.get("longitude")) if pd.notna(row.get("longitude")) else dest_lon

            dist_km = None
            if dest_lat is not None and dest_lon is not None and lat is not None and lon is not None:
                try:
                    dist_km = _haversine_distance(dest_lat, dest_lon, lat, lon)
                except Exception:
                    pass

            # Formulate fallback reason
            reason_parts = []
            if is_rainy and ("indoor" in str(row.get("indoor_outdoor", "")).lower() or category in ("Food", "Museum", "Culture")):
                reason_parts.append(f"Great indoor stop in {dest_city} suitable for rainy weather")
            if rating and rating >= 4.5:
                reason_parts.append(f"Top rated ({rating}★)")
            if bool(row.get("hidden_gem", False)):
                reason_parts.append("Curated hidden gem")
            reason = " • ".join(reason_parts) if reason_parts else f"Recommended for {request.group_type or 'you'} in {dest_city}"

            real_image = await RealImageService.find_real_image(
                place_name=exp_name,
                city=city,
                location=location_str,
                category=category,
                experience_id=exp_id,
            )

            raw_tags = row.get("tags")
            tags_list = []
            if isinstance(raw_tags, list):
                tags_list = [str(t).strip() for t in raw_tags if str(t).strip()]
            elif isinstance(raw_tags, str) and raw_tags.strip():
                tags_list = [t.strip() for t in raw_tags.replace(";", ",").split(",") if t.strip()]

            score = float(row["_score"])
            item = RecommendationItem(
                experience_id=exp_id,
                experience_name=exp_name,
                name=exp_name,
                image_url=real_image,
                image=real_image,
                category=category,
                sub_category=sub_category if sub_category and str(sub_category) != "nan" else None,
                location=location_str,
                city=city,
                district=district if district and str(district) != "nan" else None,
                state=state if state and str(state) != "nan" else None,
                price_inr=price,
                price=price,
                duration_hours=duration_hrs,
                duration_minutes=duration_mins,
                rating=rating,
                review_count=review_count,
                distance_km=dist_km,
                latitude=lat,
                longitude=lon,
                recommendation_score=round(score, 4),
                score=round(score, 4),
                reason=reason,
                tags=tags_list if tags_list else None,
                best_for=str(row.get("best_for")) if pd.notna(row.get("best_for")) and str(row.get("best_for")) != "nan" else None,
                local_experience=bool(row.get("local_experience", True)),
                hidden_gem=bool(row.get("hidden_gem", False)),
                indoor_outdoor=str(row.get("indoor_outdoor", "Flexible")),
                booking_required=bool(row.get("booking_required", False)),
            )
            items.append(item)

        return items

    @classmethod
    async def execute_smart_search(cls, request: SmartSearchRequest) -> SmartSearchResponse:
        """
        Executes smart natural-language search by parsing traveler prompt
        and running it through the Gemini recommendation engine.
        """
        try:
            from backend.app.services.smart_search_service import SmartSearchService
        except ImportError:
            from app.services.smart_search_service import SmartSearchService

        intent = SmartSearchService.parse_intent_with_groq(request.query)

        rec_req = RecommendationRequest(
            destination=intent.destination or request.city or "",
            city=intent.destination or request.city,
            user_lat=request.user_lat,
            user_lon=request.user_lon,
            budget_inr=intent.budget_inr,
            available_time_hours=intent.available_time_hours,
            traveler_count=intent.traveler_count,
            group_type=intent.group_type,
            interests=intent.interests,
            top_n=30,
        )

        rec_response = await cls.get_recommendations(rec_req)
        items = rec_response.recommendations

        # Boost matching keywords
        if intent.keywords:
            lowered_keywords = [k.lower() for k in intent.keywords]
            def calculate_keyword_boost(item: RecommendationItem) -> float:
                text_corpus = f"{item.experience_name} {item.category} {item.sub_category or ''} {' '.join(item.tags or [])} {item.reason}".lower()
                matches = sum(1 for kw in lowered_keywords if kw in text_corpus)
                return item.recommendation_score + (matches * 0.05)

            items.sort(key=calculate_keyword_boost, reverse=True)

        return SmartSearchResponse(
            success=True,
            parsed_intent=intent,
            count=len(items),
            recommendations=items,
        )
