"""
Itinerary Service.
Synthesizes time-ordered, budget-aware itineraries from traveler-selected experiences.
Faithfully reproduces notebook greedy optimization and geographical ordering.
"""
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import logging
import re
import sys
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.recommendation.engine import haversine_km
try:
    from backend.app.schemas.itinerary_schemas import (
        ItineraryGenerateRequest,
        ItineraryGenerateResponse,
        ScheduledExperience,
        SkippedExperience,
        ItineraryV1GenerateRequest,
        ItineraryV1Response,
        ItineraryDaySchedule,
        ItineraryActivity,
        ItineraryCoordinates,
        DestinationInfo,
    )
    from backend.app.services.recommendation_service import RecommendationService
    from backend.app.services.routing_service import RoutingService
    from backend.app.services.place_image_resolver import PlaceImageResolver
    from backend.app.services.weather_service import WeatherService
    from backend.app.services.real_image_service import RealImageService
    from backend.app.core.config import settings
except ImportError:
    from app.schemas.itinerary_schemas import (
        ItineraryGenerateRequest,
        ItineraryGenerateResponse,
        ScheduledExperience,
        SkippedExperience,
        ItineraryV1GenerateRequest,
        ItineraryV1Response,
        ItineraryDaySchedule,
        ItineraryActivity,
        ItineraryCoordinates,
        DestinationInfo,
    )
    from app.services.recommendation_service import RecommendationService
    from app.services.routing_service import RoutingService
    from app.services.place_image_resolver import PlaceImageResolver
    from app.services.weather_service import WeatherService
    from app.services.real_image_service import RealImageService
    from app.core.config import settings

logger = logging.getLogger(__name__)


class ItineraryService:
    """
    Service layer for time-aware, budget-aware, and route-optimized itinerary synthesis.
    """

    @classmethod
    def generate_itinerary(cls, request: ItineraryGenerateRequest) -> ItineraryGenerateResponse:
        """
        Synthesize a realistic chronological itinerary from selected experiences.
        """
        engine = RecommendationService.get_engine()
        experiences_df = engine.get_experiences_df()

        if experiences_df.empty:
            raise ValueError("Experience catalog is empty.")

        # 1. Filter selected experiences
        selected_ids = [str(eid).strip() for eid in request.selected_experience_ids if str(eid).strip()]

        # Resolve geographic anchor coordinates if user coordinates are not provided
        anchor_lat = request.user_lat
        anchor_lon = request.user_lon
        dest_text = (request.destination or request.start_location or "").strip()
        if dest_text and (anchor_lat is None or anchor_lon is None):
            coords = WeatherService.get_coordinates_for_destination(dest_text)
            if coords:
                anchor_lat, anchor_lon = coords
        if anchor_lat is None or anchor_lon is None:
            raise ValueError(
                f"Geographic coordinates could not be determined for destination '{dest_text or 'unspecified'}'. "
                f"Please provide valid coordinates or a recognized destination."
            )

        if selected_ids:
            # Match IDs with flexible prefix handling ('EXP-' or standard)
            clean_ids = set(selected_ids)
            for sid in selected_ids:
                if sid.startswith("EXP-"):
                    clean_ids.add(sid[4:])
                else:
                    clean_ids.add(f"EXP-{sid}")

            id_series = experiences_df["experience_id"].astype(str)
            matched_df = experiences_df[id_series.isin(clean_ids)].copy()

            # If any selected_ids are not in the database catalog (e.g. dynamic or fallback), synthesize rows
            found_ids = set(matched_df["experience_id"].astype(str)) if not matched_df.empty else set()
            missing = []
            for sid in selected_ids:
                raw_id = sid.replace("EXP-", "")
                if sid not in found_ids and raw_id not in found_ids:
                    missing.append({
                        "experience_id": sid,
                        "experience_name": sid.replace("EXP-", "").replace("-", " ").title(),
                        "category": "Local Experience",
                        "city": request.destination or "Local Explorer",
                        "location": request.destination or "Local Area",
                        "price_inr_clean": 250.0,
                        "price_inr": 250.0,
                        "duration_hours_clean": 1.0,
                        "duration_hours": 1.0,
                        "rating": 4.8,
                        "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
                    })
            if missing:
                missing_df = pd.DataFrame(missing)
                matched_df = pd.concat([matched_df, missing_df], ignore_index=True) if not matched_df.empty else missing_df
        else:
            # If no IDs selected, use notebook candidate scoring to pick top experiences
            # Dynamic KM area calculation based on available time limit
            avail_hrs = float(request.available_time_hours or 5.0)
            if avail_hrs <= 1.5:
                time_radius_km = 6.0
            elif avail_hrs <= 2.5:
                time_radius_km = 10.0
            elif avail_hrs <= 4.0:
                time_radius_km = 18.0
            elif avail_hrs <= 6.0:
                time_radius_km = 25.0
            else:
                time_radius_km = 35.0

            scored = engine.get_scored_candidates(
                budget_inr=request.budget_inr or 4000.0,
                available_time_hours=avail_hrs,
                traveler_count=request.traveler_count or 1,
                group_type=request.group_type or "Solo",
                interests=[],
                user_lat=anchor_lat,
                user_lon=anchor_lon,
                radius_km=time_radius_km,
            )
            # If candidate search with anchor was too restrictive, fallback without radius
            if scored.empty and anchor_lat is not None:
                scored = engine.get_scored_candidates(
                    budget_inr=request.budget_inr or 4000.0,
                    available_time_hours=avail_hrs,
                    traveler_count=request.traveler_count or 1,
                    group_type=request.group_type or "Solo",
                    interests=[],
                    user_lat=None,
                    user_lon=None,
                )
                if request.destination:
                    dest_match = scored[scored["city"].astype(str).str.lower().str.contains(request.destination.lower())]
                    if not dest_match.empty:
                        scored = dest_match

            matched_df = engine.build_itinerary(
                scored,
                available_time_hours=avail_hrs,
                budget_inr=request.budget_inr or 4000.0,
            )

            # If build_itinerary returned fewer stops than desired (e.g. 1 instead of 3),
            # supplement with top scored candidates in the reachable KM area
            desired_stops = int(getattr(request, "desired_experience_count", 0) or getattr(request, "places_to_visit", 0) or (3 if avail_hrs <= 3.0 else 4))
            if len(matched_df) < desired_stops and not scored.empty:
                matched_df = scored.head(desired_stops).copy()

        target_count = len(selected_ids) if selected_ids else int(getattr(request, "desired_experience_count", 0) or getattr(request, "places_to_visit", 0) or (3 if float(request.available_time_hours or 5.0) <= 3.0 else 4))
        if matched_df.empty:
            if dest_text:
                dest_clean = dest_text.lower()
                city_mask = (
                    experiences_df["city"].astype(str).str.lower().str.contains(dest_clean)
                    | experiences_df["location"].astype(str).str.lower().str.contains(dest_clean)
                )
                dest_matches = experiences_df[city_mask]
                if not dest_matches.empty:
                    matched_df = dest_matches.head(max(target_count, 1)).copy()
            if matched_df.empty:
                raise ValueError(
                    f"No experiences available in catalog for destination '{dest_text or 'unspecified'}'. "
                    f"Please select experiences or choose a supported destination."
                )

        # Parse user's start time and duration limit
        start_dt = cls._parse_start_time(request.trip_date, request.start_time)
        max_duration_minutes = int(round(float(request.available_time_hours or 5.0) * 60))
        trip_end_limit_dt = start_dt + timedelta(minutes=max_duration_minutes)

        # 2. Geographically order candidate experiences to minimize travel
        start_lat = anchor_lat
        start_lon = anchor_lon

        candidates = matched_df.to_dict(orient="records")
        
        # Ensure every candidate has valid latitude/longitude for map
        for c in candidates:
            c_lat = c.get("latitude")
            c_lon = c.get("longitude")
            if c_lat is None or pd.isna(c_lat) or str(c_lat).strip() == "" or str(c_lat) == "nan":
                # Fallback to city or destination anchor coordinates
                city_val = str(c.get("city") or request.destination or "").lower()
                c_coords = WeatherService.get_coordinates_for_destination(city_val) or (anchor_lat, anchor_lon)
                c["latitude"] = c_coords[0] + (len(str(c.get("experience_id", ""))) % 5) * 0.005
                c["longitude"] = c_coords[1] + (len(str(c.get("experience_name", ""))) % 5) * 0.005

        # If start coordinates are not provided, use the first experience's coordinate or destination anchor
        if (start_lat is None or start_lon is None) and candidates:
            start_lat = float(candidates[0].get("latitude") or anchor_lat)
            start_lon = float(candidates[0].get("longitude") or anchor_lon)
        elif start_lat is None or start_lon is None:
            start_lat = anchor_lat
            start_lon = anchor_lon

        ordered_candidates = cls._order_candidates_spatially(candidates, start_lat, start_lon)

        # 3. Dynamic Adaptive Duration Scaling & KM Reachability Allocation
        # When a traveler has a specific time limit (e.g. 2 hours) and multiple stops (e.g. 3 stops),
        # allocate durations and travel times adaptively so ALL stops are included rather than skipped!
        num_candidates = len(ordered_candidates)
        allocated_durations = {}

        if num_candidates > 0 and max_duration_minutes > 0:
            # Estimate transit between consecutive stops along the route
            transit_estimates = []
            prev_l, prev_o = start_lat, start_lon
            for c_idx, c in enumerate(ordered_candidates):
                c_lat = float(c.get("latitude") or start_lat or 18.9894)
                c_lon = float(c.get("longitude") or start_lon or 73.1175)
                if c_idx == 0:
                    if request.user_lat is not None and request.user_lon is not None:
                        t_info = RoutingService.get_travel_time(prev_l, prev_o, c_lat, c_lon)
                        transit_estimates.append(min(t_info.get("duration_minutes", 10), 20))
                    else:
                        transit_estimates.append(0)
                else:
                    t_info = RoutingService.get_travel_time(prev_l, prev_o, c_lat, c_lon)
                    transit_estimates.append(min(t_info.get("duration_minutes", 10), 25))
                prev_l, prev_o = c_lat, c_lon

            total_est_transit = sum(transit_estimates)
            # Available activity budget
            avail_act_mins = max(max_duration_minutes - total_est_transit, num_candidates * 15)

            raw_durs = [
                max(15, int(round(float(c.get("duration_hours_clean", c.get("duration_hours", 1.5))) * 60)))
                for c in ordered_candidates
            ]
            total_raw_act = sum(raw_durs)

            if total_raw_act > avail_act_mins:
                # Scale down durations proportionally so every requested experience fits in the schedule
                scale_factor = avail_act_mins / float(total_raw_act)
                min_stop_mins = 15 if num_candidates >= 4 else 20
                for c, r_d in zip(ordered_candidates, raw_durs):
                    scaled = max(min_stop_mins, int(round(r_d * scale_factor)))
                    allocated_durations[str(c.get("experience_id"))] = scaled
            else:
                for c, r_d in zip(ordered_candidates, raw_durs):
                    allocated_durations[str(c.get("experience_id"))] = r_d

        # 4. Time-Aware Chronological Scheduling Loop
        current_dt = start_dt
        scheduled: List[ScheduledExperience] = []
        skipped: List[SkippedExperience] = []

        total_experience_cost = 0.0
        total_transport_cost = 0.0

        current_lat = start_lat
        current_lon = start_lon

        for idx, exp in enumerate(ordered_candidates):
            exp_id = str(exp.get("experience_id", f"EXP-{idx+1}"))
            exp_name = str(exp.get("experience_name", "Local Experience"))
            cat = str(exp.get("category", "Local Experience"))
            sub_cat = str(exp.get("sub_category", "")) if pd.notna(exp.get("sub_category")) else None
            price = float(exp.get("price_inr_clean", exp.get("price_inr", 0.0)))
            
            # Use adaptive allocated duration to guarantee multi-stop fit
            duration_mins = allocated_durations.get(
                exp_id,
                max(20, int(round(float(exp.get("duration_hours_clean", exp.get("duration_hours", 1.5))) * 60)))
            )
            duration_hrs = round(duration_mins / 60.0, 2)
            rating = float(exp.get("rating")) if pd.notna(exp.get("rating")) else None
            lat = float(exp.get("latitude")) if pd.notna(exp.get("latitude")) else None
            lon = float(exp.get("longitude")) if pd.notna(exp.get("longitude")) else None

            # Calculate transit time from current position to this experience
            if current_lat is not None and current_lon is not None and lat is not None and lon is not None:
                transit_info = RoutingService.get_travel_time(current_lat, current_lon, lat, lon)
            else:
                dist_approx = float(exp.get("distance_km", 3.0)) if pd.notna(exp.get("distance_km")) else 3.0
                transit_info = {
                    "distance_km": dist_approx,
                    "duration_minutes": max(10, int(dist_approx * 3)),
                    "estimated_fare_inr": max(50.0, dist_approx * 15.0),
                }

            transit_mins = transit_info["duration_minutes"] if len(scheduled) > 0 else 0
            transit_cost = transit_info["estimated_fare_inr"] if len(scheduled) > 0 else 0.0

            # Projected time window for this experience
            activity_start_dt = current_dt + timedelta(minutes=transit_mins)

            # Check 1: Total Trip Duration Constraint
            is_explicit_selection = bool(request.selected_experience_ids)
            if request.available_time_hours and request.available_time_hours > 0 and not is_explicit_selection:
                # If start time is literally past the trip end limit, then skip
                if activity_start_dt >= trip_end_limit_dt:
                    skipped.append(SkippedExperience(
                        experience_id=exp_id,
                        name=exp_name,
                        reason=f"Exceeds your requested {request.available_time_hours:g} hr schedule limit (would start after trip end at {activity_start_dt.strftime('%I:%M %p')})",
                    ))
                    continue

                # If activity would end past trip_end_limit_dt, trim duration to fit exactly!
                projected_end = activity_start_dt + timedelta(minutes=duration_mins)
                if projected_end > trip_end_limit_dt:
                    remaining_mins = int((trip_end_limit_dt - activity_start_dt).total_seconds() // 60)
                    if remaining_mins >= 15:
                        duration_mins = remaining_mins
                        duration_hrs = round(duration_mins / 60.0, 2)
                    elif scheduled:
                        skipped.append(SkippedExperience(
                            experience_id=exp_id,
                            name=exp_name,
                            reason=f"Insufficient remaining time in your {request.available_time_hours:g} hr schedule",
                        ))
                        continue
            elif is_explicit_selection:
                # For explicitly selected experiences, preserve all user selections
                duration_mins = max(10, duration_mins)
                duration_hrs = round(duration_mins / 60.0, 2)

            activity_end_dt = activity_start_dt + timedelta(minutes=duration_mins)

            # Update previous stop's travel_to_next
            if scheduled:
                scheduled[-1].travel_to_next_minutes = transit_mins
                scheduled[-1].travel_to_next_distance_km = transit_info["distance_km"]

            # Format location string
            loc_str = str(exp.get("city", ""))
            if exp.get("district") and str(exp.get("district")) != "nan" and str(exp.get("district")) != "None":
                loc_str = f"{exp.get('district')}, {loc_str}"

            # Authentic CSV Image Resolution via PlaceImageResolver
            image_url = exp.get("image_url")
            if not image_url or not str(image_url).startswith("http") or "unsplash.com" in str(image_url).lower():
                resolved_img = PlaceImageResolver.get_instance().resolve_image(
                    place_id=exp_id,
                    name=exp_name,
                    location=loc_str,
                    category=cat,
                )
                image_url = resolved_img or image_url

            stop_item = ScheduledExperience(
                sequence=len(scheduled) + 1,
                experience_id=exp_id,
                experience_name=exp_name,
                name=exp_name,
                category=cat,
                sub_category=sub_cat,
                location=loc_str,
                description=str(exp.get("description", "")) if pd.notna(exp.get("description")) else "",
                image_url=image_url,
                image=image_url,
                start_time=activity_start_dt.strftime("%I:%M %p"),
                end_time=activity_end_dt.strftime("%I:%M %p"),
                duration_minutes=duration_mins,
                duration_hours=duration_hrs,
                price_inr=price,
                price=price,
                rating=rating,
                distance_km=float(transit_info["distance_km"]),
                latitude=lat,
                longitude=lon,
                indoor_outdoor=str(exp.get("indoor_outdoor_clean", exp.get("indoor_outdoor", "Flexible"))),
                booking_required=bool(exp.get("booking_required_bool", exp.get("booking_required", False))),
            )

            scheduled.append(stop_item)
            total_experience_cost += price
            total_transport_cost += transit_cost
            current_dt = activity_end_dt
            if lat is not None and lon is not None:
                current_lat = lat
                current_lon = lon

        # Calculate final overview metrics
        total_duration_mins = int((current_dt - start_dt).total_seconds() // 60)
        dur_h = total_duration_mins // 60
        dur_m = total_duration_mins % 60
        dur_str = f"{dur_h}h {dur_m}m" if dur_h > 0 and dur_m > 0 else (f"{dur_h}h" if dur_h > 0 else f"{dur_m}m")

        total_cost = total_experience_cost + total_transport_cost
        budget_limit = float(request.budget_inr or 4000.0)
        budget_exceeded = total_cost > budget_limit
        budget_warning = (
            f"Estimated total (₹{total_cost:.0f}) exceeds your ₹{budget_limit:.0f} budget by ₹{total_cost - budget_limit:.0f}"
            if budget_exceeded
            else None
        )

        dest_name = request.destination or (scheduled[0].location if scheduled else "Local Explorer")

        return ItineraryGenerateResponse(
            success=True,
            destination=dest_name,
            trip_date=request.trip_date,
            start_time=start_dt.strftime("%I:%M %p"),
            end_time=current_dt.strftime("%I:%M %p"),
            start_lat=start_lat,
            start_lon=start_lon,
            start_location=request.start_location,
            total_duration_minutes=total_duration_mins,
            total_duration_formatted=dur_str,
            total_experience_cost=round(total_experience_cost, 2),
            estimated_transport_cost=round(total_transport_cost, 2),
            total_cost=round(total_cost, 2),
            budget=budget_limit,
            budget_exceeded=budget_exceeded,
            budget_warning=budget_warning,
            scheduled_experiences=scheduled,
            itinerary=scheduled,
            skipped_experiences=skipped,
        )

    @classmethod
    def _order_candidates_spatially(
        cls,
        candidates: List[Dict[str, Any]],
        start_lat: Optional[float],
        start_lon: Optional[float],
    ) -> List[Dict[str, Any]]:
        """
        Orders candidate experiences by nearest-neighbor distance to minimize travel.
        """
        if not candidates:
            return []

        if start_lat is None or start_lon is None:
            return candidates

        remaining = list(candidates)
        ordered: List[Dict[str, Any]] = []
        cur_lat = start_lat
        cur_lon = start_lon

        while remaining:
            best_idx = 0
            best_dist = float("inf")
            for i, c in enumerate(remaining):
                lat = c.get("latitude")
                lon = c.get("longitude")
                if lat is not None and lon is not None and not pd.isna(lat) and not pd.isna(lon):
                    d = haversine_km(cur_lat, cur_lon, float(lat), float(lon))
                else:
                    d = float(c.get("distance_km", 10.0)) if pd.notna(c.get("distance_km")) else 10.0

                if d < best_dist:
                    best_dist = d
                    best_idx = i

            chosen = remaining.pop(best_idx)
            ordered.append(chosen)
            if chosen.get("latitude") and chosen.get("longitude") and pd.notna(chosen["latitude"]):
                cur_lat = float(chosen["latitude"])
                cur_lon = float(chosen["longitude"])

        return ordered

    @classmethod
    def _parse_start_time(cls, trip_date_str: str, start_time_str: str) -> datetime:
        """
        Robust parser for start time formats ('10:30', '10:30 AM', '14:00', '2:30 PM').
        """
        clean_date = str(trip_date_str).strip() if trip_date_str else "2026-09-26"
        time_s = str(start_time_str).strip().upper()

        time_patterns = [
            ("%Y-%m-%d %I:%M %p", f"{clean_date} {time_s}"),
            ("%Y-%m-%d %H:%M", f"{clean_date} {time_s}"),
            ("%Y-%m-%d %I:%M%p", f"{clean_date} {time_s}"),
            ("%Y-%m-%d %I %p", f"{clean_date} {time_s}"),
        ]

        for fmt, val in time_patterns:
            try:
                return datetime.strptime(val, fmt)
            except ValueError:
                continue

        # Regex fallback for '10:30' or '10:30 AM'
        match = re.search(r"(\d{1,2}):(\d{2})\s*(AM|PM)?", time_s)
        if match:
            hour = int(match.group(1))
            minute = int(match.group(2))
            meridiem = match.group(3)
            if meridiem == "PM" and hour < 12:
                hour += 12
            elif meridiem == "AM" and hour == 12:
                hour = 0
            try:
                d = datetime.strptime(clean_date, "%Y-%m-%d")
                return d.replace(hour=hour, minute=minute, second=0)
            except Exception:
                pass

        return datetime(2026, 9, 26, 10, 30, 0)
        
    _saved_db_file = Path(__file__).resolve().parent.parent / "data" / "saved_itineraries.json"

    @classmethod
    def _ensure_data_dir(cls):
        cls._saved_db_file.parent.mkdir(parents=True, exist_ok=True)
        if not cls._saved_db_file.exists():
            import json
            with open(cls._saved_db_file, "w", encoding="utf-8") as f:
                json.dump([], f)

    @classmethod
    def save_itinerary(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persists an itinerary record to the database/storage.
        """
        import json
        import uuid
        cls._ensure_data_dir()

        itin_id = str(data.get("itinerary_id") or f"ITIN-{uuid.uuid4().hex[:8].upper()}")
        saved_at = datetime.now().isoformat()
        
        stops = data.get("scheduled_experiences") or data.get("items") or []

        record = {
            "itinerary_id": itin_id,
            "destination": data.get("destination", "Local Tour"),
            "trip_date": data.get("trip_date", "2026-09-26"),
            "start_time": data.get("start_time", "10:30 AM"),
            "end_time": data.get("end_time", "05:00 PM"),
            "start_lat": data.get("start_lat"),
            "start_lon": data.get("start_lon"),
            "start_location": data.get("start_location"),
            "total_duration_minutes": data.get("total_duration_minutes", 360),
            "total_cost": data.get("total_cost", 0.0),
            "total_experience_cost": data.get("total_experience_cost", 0.0),
            "estimated_transport_cost": data.get("estimated_transport_cost", 0.0),
            "traveler_count": data.get("traveler_count", 1),
            "group_type": data.get("group_type", "Solo"),
            "scheduled_experiences": stops,
            "total_stops": len(stops),
            "saved_at": saved_at,
            "notes": data.get("notes", ""),
        }

        try:
            with open(cls._saved_db_file, "r", encoding="utf-8") as f:
                saved_list = json.load(f)
        except Exception:
            saved_list = []

        # Replace existing or append
        existing_idx = next((i for i, r in enumerate(saved_list) if r.get("itinerary_id") == itin_id), -1)
        if existing_idx != -1:
            saved_list[existing_idx] = record
        else:
            saved_list.insert(0, record)

        with open(cls._saved_db_file, "w", encoding="utf-8") as f:
            json.dump(saved_list, f, indent=2)

        logger.info(f"Saved itinerary {itin_id} for destination {record['destination']} with {len(stops)} stops into database.")
        return {
            "success": True,
            "itinerary_id": itin_id,
            "message": "Itinerary saved successfully into database",
            "saved_at": saved_at,
            "destination": record["destination"],
            "total_stops": len(stops),
            "total_cost": float(record["total_cost"]),
            "itinerary": record,
        }

    @classmethod
    def get_saved_itineraries(cls) -> List[Dict[str, Any]]:
        """
        Retrieves all saved itineraries from the database.
        """
        import json
        cls._ensure_data_dir()
        try:
            with open(cls._saved_db_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading saved itineraries: {e}")
            return []

    @classmethod
    def get_saved_itinerary(cls, itinerary_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single saved itinerary by ID.
        """
        all_itins = cls.get_saved_itineraries()
        for itin in all_itins:
            if itin.get("itinerary_id") == itinerary_id:
                return itin
        return None

    @classmethod
    def optimize_itinerary(cls, request: Any) -> ItineraryGenerateResponse:
        """
        Re-orders and optimizes an itinerary to minimize travel distance/time (TSP/greedy spatial routing),
        recalculating chronological windows and arrival times.
        """
        # If experience IDs are provided, re-generate through standard spatial TSP generator
        exp_ids = request.selected_experience_ids
        if not exp_ids and request.scheduled_experiences:
            exp_ids = [str(s.get("experience_id", s.get("id", ""))) for s in request.scheduled_experiences if s.get("experience_id") or s.get("id")]

        gen_req = ItineraryGenerateRequest(
            destination=request.destination or "",
            trip_date=request.trip_date or "2026-09-26",
            start_time=request.start_time or "10:30 AM",
            start_lat=request.start_lat,
            start_lon=request.start_lon,
            user_lat=request.start_lat,
            user_lon=request.start_lon,
            budget_inr=request.budget_inr or 5000.0,
            available_time_hours=request.available_time_hours or 6.0,
            selected_experience_ids=exp_ids,
        )
        return cls.generate_itinerary(gen_req)

    # ==============================================================================
    # Master System Prompt Section 10: Multi-Day Production Pipeline & User Ownership
    # ==============================================================================

    @classmethod
    async def generate_multiday_itinerary(
        cls,
        request: ItineraryV1GenerateRequest,
        user_id: str,
    ) -> ItineraryV1Response:
        """
        Stage A to H complete multi-day itinerary synthesis.
        Integrates geocoding, multi-day weather series, candidate retrieval,
        weather intelligence, spatial TSP ordering, schema validation, and persistence.
        """
        import uuid
        from datetime import date, datetime, timedelta

        # Stage A: Validate Request
        days_count = max(1, min(request.days, 14))
        dest_name = (request.destination or "").strip()
        if not dest_name:
            raise ValueError("Destination name is required for multiday itinerary generation.")

        # Stage B: Gather Context & Geocoding
        lat = None
        lng = None
        if request.coordinates:
            lat = float(request.coordinates.lat)
            lng = float(request.coordinates.lng)
        else:
            lat, lng = await WeatherService.async_resolve_target_coordinates(dest_name)
            if lat is None or lng is None:
                raise ValueError(f"Could not resolve geographic coordinates for destination '{dest_name}'.")

        # Parse start_date
        iso_start = WeatherService._parse_date_to_iso(request.start_date) or str(date.today())
        start_dt = datetime.strptime(iso_start, "%Y-%m-%d").date()

        # Multi-day Weather series
        weather_series = await WeatherService.get_forecast_series(
            lat=lat,
            lon=lng,
            destination=dest_name,
            days=days_count,
        )
        daily_weather = weather_series.get("daily", [])

        # Stage C: Gather Candidates
        engine = RecommendationService.get_engine()
        experiences_df = engine.get_experiences_df()

        clean_dest = dest_name.lower()
        candidates: List[Dict[str, Any]] = []

        if not experiences_df.empty:
            for _, row in experiences_df.iterrows():
                r_city = str(row.get("city", "")).lower()
                r_loc = str(row.get("location", "")).lower()
                r_lat = float(row["latitude"]) if pd.notna(row.get("latitude")) else None
                r_lon = float(row["longitude"]) if pd.notna(row.get("longitude")) else None

                dist = None
                if r_lat is not None and r_lon is not None:
                    try:
                        dist = haversine_km(lat, lng, r_lat, r_lon)
                    except Exception:
                        pass

                is_dest_match = clean_dest in r_city or r_city in clean_dest or clean_dest in r_loc
                is_near = dist is not None and dist <= 50.0

                if is_dest_match or is_near:
                    row_dict = row.to_dict()
                    row_dict["_distance_km"] = dist or 5.0
                    candidates.append(row_dict)

        if not candidates:
            # Fallback within matched destination city or location only
            if not experiences_df.empty:
                dest_mask = (
                    experiences_df["city"].astype(str).str.lower().str.contains(clean_dest)
                    | experiences_df["location"].astype(str).str.lower().str.contains(clean_dest)
                )
                dest_matches = experiences_df[dest_mask]
                if not dest_matches.empty:
                    for _, row in dest_matches.iterrows():
                        row_dict = row.to_dict()
                        row_dict["_distance_km"] = 5.0
                        candidates.append(row_dict)
            if not candidates:
                raise ValueError(
                    f"No experiences available in catalog for destination '{dest_name}'. "
                    f"Please choose a supported destination with verified experiences."
                )

        # Prioritize pinned place IDs if specified
        pinned_ids = set(request.selected_place_ids or [])

        def candidate_score(item: Dict[str, Any]) -> float:
            score = 1.0
            pid = str(item.get("experience_id", item.get("id", "")))
            if pid in pinned_ids:
                score += 50.0
            cat = str(item.get("category", "")).lower()
            tags = str(item.get("tags", "")).lower()
            for interest in request.interests:
                if interest.lower() in cat or interest.lower() in tags:
                    score += 2.0
            rating = item.get("rating")
            if rating and pd.notna(rating):
                score += float(rating) * 0.5
            return score

        candidates.sort(key=candidate_score, reverse=True)

        # Stage D & E: Distribute by Day, Apply Weather Adaptation & Optimize Route
        # Determine stops per day based on pace
        if request.pace == "relaxed":
            stops_per_day = 2
        elif request.pace == "fast-paced":
            stops_per_day = 5
        else:  # balanced
            stops_per_day = 3

        day_schedules: List[ItineraryDaySchedule] = []
        assigned_place_ids = set()
        candidate_idx = 0

        # Day base schedule start times
        standard_times = [
            ("09:30", "11:30"),
            ("12:00", "14:00"),
            ("14:30", "16:30"),
            ("17:00", "19:00"),
            ("19:30", "21:30"),
        ]

        for d_idx in range(days_count):
            day_num = d_idx + 1
            day_date = str(start_dt + timedelta(days=d_idx))

            # Match weather for this day
            w_item = next((w for w in daily_weather if w.get("date") == day_date), None)
            if not w_item and daily_weather:
                w_item = daily_weather[min(d_idx, len(daily_weather) - 1)]
            w_summary = w_item or {
                "condition": "Mainly Clear",
                "average_temp_c": 26.0,
                "forecast_available": True,
            }

            day_cond = str(w_summary.get("condition", "")).lower()
            day_rain = "rain" in day_cond or "thunderstorm" in day_cond or w_summary.get("rain_probability_pct", 0) >= 50
            day_temp = float(w_summary.get("average_temp_c", 26.0))

            # Pick candidates for this day
            day_stops_pool = []
            while len(day_stops_pool) < stops_per_day and candidate_idx < len(candidates):
                cand = candidates[candidate_idx]
                candidate_idx += 1
                pid = str(cand.get("experience_id", cand.get("id", "")))
                if pid not in assigned_place_ids:
                    assigned_place_ids.add(pid)
                    day_stops_pool.append(cand)

            if not day_stops_pool and candidates:
                # Reuse if catalog exhausted
                day_stops_pool = candidates[:stops_per_day]

            # Solve spatial TSP ordering for this day
            ordered_stops = cls._order_candidates_spatially(day_stops_pool, lat, lng)

            # Build activities
            activities: List[ItineraryActivity] = []
            for act_idx, stop in enumerate(ordered_stops):
                time_slot = standard_times[min(act_idx, len(standard_times) - 1)]
                stop_id = str(stop.get("experience_id", stop.get("id", f"EXP-{uuid.uuid4().hex[:6]}")))
                stop_name = str(stop.get("experience_name", stop.get("name", "Local Experience")))
                stop_cat = str(stop.get("category", "Local Experience"))
                stop_sub = str(stop.get("sub_category", "")) if pd.notna(stop.get("sub_category")) else None
                stop_loc = str(stop.get("location") or stop.get("city") or dest_name)
                stop_price = float(stop.get("price_inr_clean", stop.get("price_inr", 250.0)) or 250.0)
                stop_dur = int(round(float(stop.get("duration_hours_clean", stop.get("duration_hours", 1.5)) or 1.5) * 60))
                stop_lat = float(stop.get("latitude")) if pd.notna(stop.get("latitude")) else lat
                stop_lon = float(stop.get("longitude")) if pd.notna(stop.get("longitude")) else lng

                # Weather rationale
                if day_rain:
                    if "indoor" in str(stop.get("indoor_outdoor", "")).lower() or stop_cat.lower() in ("food", "museum", "culture"):
                        w_rat = f"Ideal sheltered/indoor stop for {w_summary.get('condition', 'rainy')} weather"
                    else:
                        w_rat = "Weather-dependent stop; check conditions before visiting"
                elif day_temp > 35.0:
                    if act_idx == 1:
                        w_rat = "Scheduled during midday heat for comfortable indoor dining/exploration"
                    else:
                        w_rat = "Pleasant morning/evening schedule avoids peak temperatures"
                else:
                    w_rat = f"Favorable {w_summary.get('condition', 'clear')} conditions for sightseeing"

                # Real image
                img_url = await RealImageService.find_real_image(
                    place_name=stop_name,
                    city=str(stop.get("city", dest_name)),
                    location=stop_loc,
                    category=stop_cat,
                    experience_id=stop_id,
                )

                activities.append(
                    ItineraryActivity(
                        place_id=stop_id,
                        name=stop_name,
                        start_time=time_slot[0],
                        end_time=time_slot[1],
                        category=stop_cat,
                        sub_category=stop_sub,
                        location=stop_loc,
                        weather_rationale=w_rat,
                        coordinates=ItineraryCoordinates(lat=stop_lat, lng=stop_lon),
                        price_inr=stop_price,
                        duration_minutes=stop_dur,
                        image_url=img_url,
                        is_completed=False,
                    )
                )

            day_schedules.append(
                ItineraryDaySchedule(
                    day_number=day_num,
                    date=day_date,
                    weather_summary=w_summary,
                    activities=activities,
                )
            )

        # Stage F & G: Calculate Totals, Assemble Response and Persist
        itinerary_id = f"ITIN-{uuid.uuid4().hex[:10].upper()}"
        total_cost = sum(act.price_inr for d in day_schedules for act in d.activities)
        total_duration = sum(act.duration_minutes for d in day_schedules for act in d.activities)

        resp = ItineraryV1Response(
            itinerary_id=itinerary_id,
            destination=DestinationInfo(
                name=dest_name,
                coordinates=ItineraryCoordinates(lat=lat, lng=lng),
            ),
            start_date=iso_start,
            days=day_schedules,
            total_cost=total_cost,
            total_duration_minutes=total_duration,
            traveler_count=1,
            pace=request.pace,
            traveler_type=request.traveler_type,
            interests=request.interests,
            metadata={
                "generation_method": "weather_aware_ml_pipeline",
                "weather_source": weather_series.get("source", "open-meteo"),
                "days_count": days_count,
                "warnings": [] if weather_series.get("forecast_available") else ["Trip dates exceed live forecast horizon (>16 days); seasonal climate model used."],
            },
        )

        # Persist to local database and Supabase
        cls._persist_v1_itinerary(resp, user_id)
        return resp

    @classmethod
    def _persist_v1_itinerary(cls, itinerary: ItineraryV1Response, user_id: str):
        """Saves V1 multi-day itinerary to local store and Supabase."""
        import json
        import urllib.request
        cls._ensure_data_dir()

        record = {
            "id": itinerary.itinerary_id,
            "itinerary_id": itinerary.itinerary_id,
            "user_id": user_id,
            "destination_name": itinerary.destination.name,
            "destination_coords": itinerary.destination.coordinates.model_dump(),
            "start_date": itinerary.start_date,
            "days_count": len(itinerary.days),
            "pace": itinerary.pace,
            "traveler_type": itinerary.traveler_type,
            "interests": itinerary.interests,
            "total_cost": itinerary.total_cost,
            "total_duration_minutes": itinerary.total_duration_minutes,
            "days": [d.model_dump() for d in itinerary.days],
            "metadata": itinerary.metadata,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }

        # Local storage
        user_itins_file = cls._saved_db_file.parent / "user_itineraries.json"
        try:
            if user_itins_file.exists():
                with open(user_itins_file, "r", encoding="utf-8") as f:
                    all_itins = json.load(f)
            else:
                all_itins = []
        except Exception:
            all_itins = []

        # Replace or append
        existing_idx = next((i for i, item in enumerate(all_itins) if item.get("id") == itinerary.itinerary_id), -1)
        if existing_idx != -1:
            all_itins[existing_idx] = record
        else:
            all_itins.insert(0, record)

        with open(user_itins_file, "w", encoding="utf-8") as f:
            json.dump(all_itins, f, indent=2)

        # Sync to Supabase table
        url = settings.SUPABASE_URL.rstrip("/")
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        if url and key:
            try:
                sb_payload = {
                    "id": itinerary.itinerary_id,
                    "user_id": user_id,
                    "destination_name": itinerary.destination.name,
                    "destination_coords": itinerary.destination.coordinates.model_dump(),
                    "start_date": itinerary.start_date,
                    "days_count": len(itinerary.days),
                    "pace": itinerary.pace,
                    "traveler_type": itinerary.traveler_type,
                    "interests": itinerary.interests,
                    "total_cost": itinerary.total_cost,
                    "raw_data": [d.model_dump() for d in itinerary.days],
                    "metadata": itinerary.metadata,
                }
                req = urllib.request.Request(
                    f"{url}/rest/v1/itineraries",
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
                logger.debug(f"Supabase itineraries sync error: {e}")

    @classmethod
    def get_user_itineraries(cls, user_id: str) -> List[Dict[str, Any]]:
        """Lists itineraries owned by authenticated user."""
        import json
        user_itins_file = cls._saved_db_file.parent / "user_itineraries.json"
        if not user_itins_file.exists():
            return []
        try:
            with open(user_itins_file, "r", encoding="utf-8") as f:
                all_itins = json.load(f)
            return [itin for itin in all_itins if itin.get("user_id") == user_id]
        except Exception:
            return []

    @classmethod
    def get_user_itinerary(cls, itinerary_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single itinerary owned by authenticated user."""
        user_itins = cls.get_user_itineraries(user_id)
        for itin in user_itins:
            if itin.get("id") == itinerary_id or itin.get("itinerary_id") == itinerary_id:
                return itin
        return None

    @classmethod
    def update_user_itinerary(cls, itinerary_id: str, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates permitted fields on an itinerary owned by user."""
        import json
        user_itins_file = cls._saved_db_file.parent / "user_itineraries.json"
        if not user_itins_file.exists():
            return None
        try:
            with open(user_itins_file, "r", encoding="utf-8") as f:
                all_itins = json.load(f)
            target = None
            for item in all_itins:
                if (item.get("id") == itinerary_id or item.get("itinerary_id") == itinerary_id) and item.get("user_id") == user_id:
                    item.update(updates)
                    item["updated_at"] = datetime.now().isoformat()
                    target = item
                    break
            if target:
                with open(user_itins_file, "w", encoding="utf-8") as f:
                    json.dump(all_itins, f, indent=2)
            return target
        except Exception as e:
            logger.error(f"Error updating user itinerary: {e}")
            return None

    @classmethod
    def delete_user_itinerary(cls, itinerary_id: str, user_id: str) -> bool:
        """Deletes an itinerary owned by authenticated user."""
        import json
        import urllib.request
        user_itins_file = cls._saved_db_file.parent / "user_itineraries.json"
        if not user_itins_file.exists():
            return False
        try:
            with open(user_itins_file, "r", encoding="utf-8") as f:
                all_itins = json.load(f)
            new_list = [item for item in all_itins if not ((item.get("id") == itinerary_id or item.get("itinerary_id") == itinerary_id) and item.get("user_id") == user_id)]
            with open(user_itins_file, "w", encoding="utf-8") as f:
                json.dump(new_list, f, indent=2)

            # Sync to Supabase
            url = settings.SUPABASE_URL.rstrip("/")
            key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
            if url and key:
                try:
                    req = urllib.request.Request(
                        f"{url}/rest/v1/itineraries?id=eq.{itinerary_id}&user_id=eq.{user_id}",
                        headers={
                            "apikey": key,
                            "Authorization": f"Bearer {key}",
                        },
                        method="DELETE",
                    )
                    with urllib.request.urlopen(req, timeout=3):
                        pass
                except Exception as sb_err:
                    logger.debug(f"Supabase delete error: {sb_err}")
            return True
        except Exception as e:
            logger.error(f"Error deleting user itinerary: {e}")
            return False
