"""
Itinerary API Endpoints.
Exposes POST /api/itinerary/generate to synthesize chronological itineraries from selected experiences.
"""
from fastapi import APIRouter, HTTPException, status
try:
    from app.schemas.itinerary_schemas import (
        ItineraryGenerateRequest,
        ItineraryGenerateResponse,
        ItineraryChatOptimizeRequest,
        ItineraryChatOptimizeResponse,
    )
    from app.services.itinerary_service import ItineraryService
    from app.services.nugen_service import NugenService
    from app.services.weather_service import WeatherService
    from app.core.config import settings
except ImportError:
    from backend.app.schemas.itinerary_schemas import (
        ItineraryGenerateRequest,
        ItineraryGenerateResponse,
        ItineraryChatOptimizeRequest,
        ItineraryChatOptimizeResponse,
    )
    from backend.app.services.itinerary_service import ItineraryService
    from backend.app.services.nugen_service import NugenService
    from backend.app.services.weather_service import WeatherService
    from backend.app.core.config import settings
import json
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Itinerary"])


@router.post("/generate", response_model=ItineraryGenerateResponse)
@router.post("/generate/", response_model=ItineraryGenerateResponse, include_in_schema=False)
async def generate_itinerary(request: ItineraryGenerateRequest):
    """
    Generate a realistic, time-ordered, budget-aware itinerary from traveler-selected experiences.
    Takes into account exact trip start time, travel duration, opening hours, and budget.
    """
    try:
        # Rajiv's ML system generates the primary authoritative itinerary
        response = ItineraryService.generate_itinerary(request)

        # Nugen AI Enhancement + Validation Layer (Runs strictly AFTER generation)
        if getattr(settings, "NUGEN_ENABLED", False):
            try:
                # Environmental & Weather Context Ingestion (Section 20 Digital-Twin compatibility)
                weather_context = None
                live_gps_context = None
                try:
                    # Always fetch true, unsimulated live GPS meteorological conditions
                    live_gps_context = await WeatherService.get_weather_forecast(
                        lat=request.user_lat or request.start_lat,
                        lon=request.user_lon or request.start_lon,
                        destination=request.destination,
                        override_condition=None,
                    )

                    # If request specifies a simulated scenario, evaluate it; otherwise use live GPS
                    if request.weather_condition and request.weather_condition.strip().lower() not in ("live", "live gps", "current"):
                        weather_context = await WeatherService.get_weather_forecast(
                            lat=request.user_lat or request.start_lat,
                            lon=request.user_lon or request.start_lon,
                            destination=request.destination,
                            override_condition=request.weather_condition,
                        )
                    else:
                        weather_context = live_gps_context
                except Exception as w_err:
                    logger.debug(f"[NUGEN] Weather context fetch skipped: {w_err}")

                user_constraints = {
                    "budget": request.budget_inr or request.budget,
                    "available_time_hours": request.available_time_hours or request.duration_hours,
                    "traveler_count": request.traveler_count,
                    "group_type": request.group_type or request.traveler_type,
                    "interests": getattr(request, "interests", []),
                    "selected_places": request.selected_experience_ids,
                    "destination": request.destination,
                }
                nugen_insights = await NugenService.enhance_itinerary(
                    user_constraints=user_constraints,
                    generated_itinerary=response.model_dump(),
                    weather=weather_context,
                    live_weather=live_gps_context,
                )
                if nugen_insights:
                    response.nugen = nugen_insights
            except Exception as nugen_err:
                logger.error(f"[NUGEN] Non-critical enhancement error: {nugen_err}", exc_info=True)

        return response
    except ValueError as ve:
        logger.warning(f"Invalid itinerary request: {ve}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_REQUEST",
                "message": str(ve),
            },
        )
    except Exception as e:
        logger.error(f"Error generating itinerary: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "ITINERARY_GENERATION_FAILED",
                "message": f"Failed to synthesize itinerary: {str(e)}",
            },
        )


@router.post("/save")
@router.post("/save/", include_in_schema=False)
async def save_itinerary(request: dict):
    """
    Save a generated itinerary to the database.
    """
    try:
        res = ItineraryService.save_itinerary(request)
        return res
    except Exception as e:
        logger.error(f"Error saving itinerary: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "ITINERARY_SAVE_FAILED",
                "message": f"Failed to save itinerary to database: {str(e)}",
            },
        )


@router.get("/list")
@router.get("/list/", include_in_schema=False)
async def list_saved_itineraries():
    """
    List all saved itineraries from the database.
    """
    try:
        items = ItineraryService.get_saved_itineraries()
        return {
            "success": True,
            "count": len(items),
            "itineraries": items,
        }
    except Exception as e:
        logger.error(f"Error listing saved itineraries: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "ITINERARY_LIST_FAILED",
                "message": f"Failed to list saved itineraries: {str(e)}",
            },
        )


@router.post("/optimize", response_model=ItineraryGenerateResponse)
@router.post("/optimize/", response_model=ItineraryGenerateResponse, include_in_schema=False)
async def optimize_itinerary(request: ItineraryGenerateRequest):
    """
    Re-optimize an itinerary route for minimum transit duration and optimal sequence.
    """
    try:
        response = ItineraryService.optimize_itinerary(request)

        # Nugen AI Enhancement + Validation Layer (Runs strictly AFTER optimization)
        if getattr(settings, "NUGEN_ENABLED", False):
            try:
                user_constraints = {
                    "budget": request.budget_inr or request.budget,
                    "available_time_hours": request.available_time_hours or request.duration_hours,
                    "traveler_count": request.traveler_count,
                    "group_type": request.group_type or request.traveler_type,
                    "interests": getattr(request, "interests", []),
                    "selected_places": request.selected_experience_ids,
                    "destination": request.destination,
                }
                nugen_insights = await NugenService.enhance_itinerary(
                    user_constraints=user_constraints,
                    generated_itinerary=response.model_dump(),
                )
                if nugen_insights:
                    response.nugen = nugen_insights
            except Exception as nugen_err:
                logger.error(f"[NUGEN] Non-critical enhancement error in optimize: {nugen_err}", exc_info=True)

        return response
    except Exception as e:
        logger.error(f"Error optimizing itinerary: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "ITINERARY_OPTIMIZATION_FAILED",
                "message": f"Failed to optimize itinerary: {str(e)}",
            },
        )


@router.post("/optimize/chat", response_model=ItineraryChatOptimizeResponse)
@router.post("/optimize/chat/", response_model=ItineraryChatOptimizeResponse, include_in_schema=False)
async def optimize_itinerary_chat(request: ItineraryChatOptimizeRequest):
    """
    Conversational Local Travel Guide & Itinerary Companion (LocalLens Saathi) using Groq AI.
    - Provides rich information, history, local food tips, and secrets about stops & experiences.
    - Parses traveler intents (e.g., swapping food with beaches, budget changes, route optimization)
      and returns structured preference modifications.
    - Indian context, ₹ INR currency, culturally warm and multilingual (English, Hindi, Hinglish).
    """
    prompt = request.prompt.strip()
    if not prompt:
        return ItineraryChatOptimizeResponse(
            reply="Namaste! 🙏 I am LocalLens Saathi (आपका साथी). Tell me what you'd like to know about your stops or how you want to adjust your trip!",
            is_info_query=True,
        )

    groq_api_key = (
        getattr(settings, "GROQ_API_KEY", "")
        or os.getenv("GROQ_API_KEY", "")
        or getattr(settings, "LLM_API_KEY", "")
    ).strip()

    # Format places details context if provided
    stops_summary = []
    if request.places_details:
        for idx, p in enumerate(request.places_details, 1):
            p_name = p.get("name") or p.get("experience_name") or f"Stop {idx}"
            p_cat = p.get("category", "Experience")
            p_loc = p.get("location", "")
            p_desc = p.get("description", "")
            stops_summary.append(f"{idx}. {p_name} ({p_cat}, {p_loc}) - {p_desc[:120]}")
    elif request.current_place_names:
        stops_summary = [f"{idx}. {name}" for idx, name in enumerate(request.current_place_names, 1)]
    else:
        stops_summary = ["General stops in destination"]

    stops_text = "\n".join(stops_summary)

    system_prompt = f"""You are LocalLens Saathi (लोकललेंस साथी) — an authentic, warm, deeply knowledgeable Indian local travel companion, guide, and itinerary assistant.
You speak with authentic Indian warmth and hospitality (using "Namaste 🙏", "Aapka Saathi", Indian context, ₹ INR prices). You understand English, Hindi (हिन्दी), and Hinglish fluently, matching the traveler's language.

Current Trip State:
- Destination / City: {request.destination or 'India'}
- Current Interests: {', '.join(request.current_interests or ['General Local Experiences'])}
- Current Stops in Itinerary:
{stops_text}
- Budget: ₹{request.budget or 5000}
- Duration: {request.duration_hours or 6.0} hours

Your Dual Superpower:
1. 🏛️ INFORMATIONAL LOCAL GUIDE (Places, Food, Culture, History & Insider Tips):
   - If the traveler asks about ANY place, stop, landmark, history, culture, what to eat, street food, best photo spots, entry fee, timings, or local secrets (e.g. "tell me about Belapur Fort", "what food to try?", "history of this spot", "is it good for families?"):
   - Provide rich, captivating, authentic insider details!
   - Highlight the history, vibe, and local stories.
   - For food: suggest specific Indian local specialties (e.g. Vada Pav, cutting chai, Bun Maska, local thali, coastal fish curry, chaat).
   - For heritage/culture: describe architectural highlights, background, significance.
   - For logistics: give practical Indian travel hacks (auto rickshaws, best time of day to avoid crowds/heat).
   - In this mode: "is_info_query": true, "should_regenerate": false, "remove_interests": [], "add_interests": [].

2. ⚡ TRIP OPTIMIZER & MODIFIER:
   - When the traveler asks to change, swap, add, or remove stops/interests (e.g., "swap food with beaches", "no food", "more adventure", "reduce budget to ₹2000", "fastest route"):
   - Identify categories to add or remove.
   - Categories recognized: Beach, Food, Culture, Adventure, Nature, Heritage, Shopping, Nightlife, Photography, Wellness, Hidden Gems, Local Experiences.
   - If they want to regenerate/modify the itinerary: "should_regenerate": true, "is_info_query": false.
   - If they only want route sequence optimization: "is_route_reorder_only": true, "is_info_query": false.

Output STRICTLY a single valid JSON object with keys:
{{
  "reply": "Your warm, engaging, informative or optimization response as LocalLens Saathi (use ₹ for currency)",
  "is_info_query": true/false,
  "remove_interests": ["..."],
  "add_interests": ["..."],
  "custom_notes": "...",
  "updated_budget": null,
  "updated_duration_hours": null,
  "should_regenerate": false,
  "is_route_reorder_only": false
}}
"""

    models_to_try = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"]

    for model in models_to_try:
        try:
            async with httpx.AsyncClient(timeout=14.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_api_key}",
                        "Content-Type": "application/json",
                        "User-Agent": "LocalLens/1.0",
                    },
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.4,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    is_info = bool(parsed.get("is_info_query", False))
                    return ItineraryChatOptimizeResponse(
                        reply=parsed.get("reply", "Namaste! LocalLens Saathi at your service."),
                        is_info_query=is_info,
                        remove_interests=parsed.get("remove_interests") or [],
                        add_interests=parsed.get("add_interests") or [],
                        custom_notes=parsed.get("custom_notes"),
                        updated_budget=parsed.get("updated_budget"),
                        updated_duration_hours=parsed.get("updated_duration_hours"),
                        should_regenerate=bool(parsed.get("should_regenerate") and not is_info),
                        is_route_reorder_only=bool(parsed.get("is_route_reorder_only")),
                    )
        except Exception as e:
            logger.warning(f"[LocalLensSaathi] Model {model} attempt failed: {e}")

    # Fallback intelligent local logic
    lower = prompt.lower()
    is_info = any(k in lower for k in [
        "tell me", "about", "history", "what is", "what's", "special", "food to try",
        "info", "details", "explain", "famous", "story", "timing", "entry", "kya hai",
        "kaisa hai", "batao", "baare me", "recommend food", "local eats"
    ])

    remove_list = []
    add_list = []
    if "beach" in lower or "beaches" in lower:
        add_list.append("Beach")
    if "food" in lower and ("change" in lower or "replace" in lower or "remove" in lower or "no " in lower):
        remove_list.append("Food")
    elif "food" in lower and not add_list and not is_info:
        add_list.append("Food")

    is_reorder = "route" in lower or "order" in lower or "fastest" in lower

    if is_info:
        dest = request.destination or "your destination"
        first_stop = request.current_place_names[0] if request.current_place_names else "this destination"
        reply = (
            f"Namaste! 🙏 As your LocalLens Saathi, here is what makes {first_stop} in {dest} special: "
            f"It offers rich local culture, vibrant street energy, and authentic experiences. "
            f"Pro tip: Try local street snacks like hot Vada Pav & cutting chai nearby, and visit during morning or golden hour for the best experience!"
        )
        return ItineraryChatOptimizeResponse(
            reply=reply,
            is_info_query=True,
            remove_interests=[],
            add_interests=[],
            custom_notes=prompt,
            should_regenerate=False,
            is_route_reorder_only=False,
        )

    reply = "Namaste! 🙏 I've updated your trip preferences based on your request. Ready to refresh your itinerary!"
    if remove_list and add_list:
        reply = f"Swapped {', '.join(remove_list)} with {', '.join(add_list)}! Generating fresh recommendations for you."

    return ItineraryChatOptimizeResponse(
        reply=reply,
        is_info_query=False,
        remove_interests=remove_list,
        add_interests=add_list,
        custom_notes=prompt,
        should_regenerate=bool(remove_list or add_list or "generate" in lower),
        is_route_reorder_only=is_reorder,
    )


@router.get("/weather/conditions")
async def get_weather_conditions():
    """Returns all available meteorological profiles for weather simulation and planning."""
    return WeatherService.get_all_weather_conditions()
