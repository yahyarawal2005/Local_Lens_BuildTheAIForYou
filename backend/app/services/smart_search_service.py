"""
Smart Search & Semantic Intent Parsing Service.
Uses Groq LLM (OpenAI-compatible endpoints) as a prompt-engineered intent parser
to convert natural language travel prompts into structured parameters for the ML Recommendation Engine.
"""
from typing import Any, Dict, List, Optional
import json
import logging
import os
import re
import urllib.request
import urllib.error

try:
    from backend.app.schemas.recommendation_schemas import (
        ParsedTravelIntent,
        RecommendationItem,
        RecommendationRequest,
        SmartSearchRequest,
        SmartSearchResponse,
    )
    from backend.app.services.recommendation_service import RecommendationService
    from backend.app.core.config import settings
except ImportError:
    from app.schemas.recommendation_schemas import (
        ParsedTravelIntent,
        RecommendationItem,
        RecommendationRequest,
        SmartSearchRequest,
        SmartSearchResponse,
    )
    from app.services.recommendation_service import RecommendationService
    from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert AI Travel Planner and Intent Extraction Engine for LocalLens.
Your task is to analyze the traveler's natural language input from the app search bar and extract structured travel parameters.

Analyze the prompt for:
1. "destination": The target city, neighborhood, or region (e.g., "Mumbai", "Delhi", "Bandra", "Juhu", "Goa"). Default: null if not specified.
2. "available_time_hours": Total duration in hours as a float.
   - "2 hr", "2 hours", "2h" -> 2.0
   - "90 mins", "1.5 hours" -> 1.5
   - "half day" -> 4.0
   - "full day" -> 8.0
   - Default: 4.0 if not mentioned.
3. "budget_inr": Total budget in Indian Rupees (INR) as a float.
   - "1500", "₹1500", "1500 inr", "1.5k" -> 1500.0
   - "2k" -> 2000.0
   - "cheap", "low budget" -> 1000.0
   - Default: 2500.0 if not mentioned.
4. "traveler_count": Total number of travelers as integer.
   - "couple", "with my partner", "with wife/husband" -> 2
   - "with 3 friends" -> 4 (user + 3 friends)
   - "solo", "alone" -> 1
   - Default: 1.
5. "group_type": One of ["Solo", "Couple", "Friends", "Family", "Group"].
6. "interests": Standardized category list matching the user's vibe from:
   ["Street Food", "Heritage & History", "Nature & Wildlife", "Adventure & Outdoor", 
    "Art & Architecture", "Markets & Shopping", "Nightlife & Bars", "Beach & Coastal", 
    "Water Sports", "Cafes & Dining", "Wellness & Spiritual", "Local Culture"].
7. "desired_experience_count": Number of places or stops the traveler wants to visit.
   - "visit 3 places", "3 things", "3 spots" -> 3
   - Default: 3 if available_time_hours <= 3.0, otherwise 4.
8. "keywords": 3 to 6 specific search tags/nouns extracted from the prompt (e.g. ["street food", "sunset", "beach", "chaat"]).
9. "vibe_summary": A concise, friendly 1-sentence description of the requested vibe (e.g. "2-hour coastal sunset & street food walk for a couple under ₹1,500").

OUTPUT FORMAT:
Respond with ONLY valid JSON with keys:
"destination", "available_time_hours", "budget_inr", "traveler_count", "group_type", "interests", "desired_experience_count", "keywords", "vibe_summary".
"""


class SmartSearchService:
    """
    Service layer providing Groq-powered natural language prompt parsing
    connected directly to the ML recommendation system.
    """

    GROQ_MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"]

    @classmethod
    def get_groq_api_key(cls) -> str:
        return (
            os.getenv("GROQ_API_KEY")
            or getattr(settings, "GROQ_API_KEY", "")
        ).strip()

    @classmethod
    def parse_intent_with_groq(cls, query: str) -> ParsedTravelIntent:
        """
        Calls Groq LLM with prompt engineering and JSON response format.
        Falls back to rule-based parser if network or API error occurs.
        """
        api_key = cls.get_groq_api_key()
        if not api_key:
            logger.warning("No Groq API key available. Using rule-based fallback.")
            return cls._fallback_rule_based_parser(query)

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (LocalLens/1.0)",
        }

        for model_name in cls.GROQ_MODELS:
            payload = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": query},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
                "max_tokens": 500,
            }

            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                )
                with urllib.request.urlopen(req, timeout=6) as resp:
                    if resp.status == 200:
                        raw_data = json.loads(resp.read().decode("utf-8"))
                        content = raw_data["choices"][0]["message"]["content"]
                        parsed_json = json.loads(content)
                        logger.info(f"Groq successfully parsed query using {model_name}: {parsed_json}")
                        return ParsedTravelIntent(
                            destination=parsed_json.get("destination"),
                            available_time_hours=float(parsed_json.get("available_time_hours") or 4.0),
                            budget_inr=float(parsed_json.get("budget_inr") or 2500.0),
                            traveler_count=int(parsed_json.get("traveler_count") or 1),
                            group_type=str(parsed_json.get("group_type") or "Solo").title(),
                            interests=list(parsed_json.get("interests") or []),
                            desired_experience_count=int(parsed_json.get("desired_experience_count") or 3),
                            keywords=list(parsed_json.get("keywords") or []),
                            vibe_summary=str(parsed_json.get("vibe_summary") or query),
                        )
            except Exception as e:
                logger.debug(f"Groq model {model_name} attempt failed: {e}")
                continue

        logger.warning("All Groq models failed. Falling back to rule-based parser.")
        return cls._fallback_rule_based_parser(query)

    @classmethod
    def _fallback_rule_based_parser(cls, query: str) -> ParsedTravelIntent:
        """
        Deterministic regex & keyword parser used when LLM endpoint is unreachable.
        """
        q = query.lower()

        # 1. Duration Extraction
        hours = 4.0
        time_match = re.search(r"(\d+(\.\d+)?)\s*(hr|hour|h\b)", q)
        if time_match:
            hours = float(time_match.group(1))
        elif "half day" in q:
            hours = 4.0
        elif "full day" in q or "all day" in q:
            hours = 8.0
        elif "90 min" in q:
            hours = 1.5

        # 2. Budget Extraction
        budget = 2500.0
        budget_match = re.search(r"(?:budget|₹|rs\.?|inr|under)?\s*(\d{3,6})", q)
        if budget_match:
            budget = float(budget_match.group(1))
        elif "2k" in q:
            budget = 2000.0
        elif "1k" in q:
            budget = 1000.0
        elif "3k" in q:
            budget = 3000.0
        elif "5k" in q:
            budget = 5000.0

        # 3. Group and Traveler Count
        traveler_count = 1
        group_type = "Solo"
        if "couple" in q or "partner" in q or "girlfriend" in q or "boyfriend" in q or "two of us" in q:
            traveler_count = 2
            group_type = "Couple"
        elif "friend" in q or "gang" in q or "buddies" in q:
            count_m = re.search(r"(\d+)\s*friends?", q)
            traveler_count = (int(count_m.group(1)) + 1) if count_m else 3
            group_type = "Friends"
        elif "family" in q or "kids" in q:
            traveler_count = 4
            group_type = "Family"

        # 4. Desired Experience Count
        places_count = 3
        place_match = re.search(r"(\d+)\s*(places?|things?|spots?|stops?)", q)
        if place_match:
            places_count = int(place_match.group(1))
        else:
            places_count = 3 if hours <= 3.0 else 4

        # 5. Destination Detection
        cities = ["mumbai", "delhi", "bangalore", "goa", "jaipur", "pune", "hyderabad", "kolkata", "chennai", "bandra", "juhu", "colaba"]
        dest = None
        for c in cities:
            if c in q:
                dest = c.title()
                break

        # 6. Interests Matching
        interests = []
        interest_mapping = {
            "street food": "Street Food",
            "food": "Street Food",
            "chaat": "Street Food",
            "eat": "Street Food",
            "cafe": "Cafes & Dining",
            "dining": "Cafes & Dining",
            "sunset": "Beach & Coastal",
            "beach": "Beach & Coastal",
            "heritage": "Heritage & History",
            "history": "Heritage & History",
            "culture": "Local Culture",
            "art": "Art & Architecture",
            "nature": "Nature & Wildlife",
            "adventure": "Adventure & Outdoor",
            "kayak": "Water Sports",
            "water": "Water Sports",
            "market": "Markets & Shopping",
            "shop": "Markets & Shopping",
            "night": "Nightlife & Bars",
        }
        keywords = []
        for k, category in interest_mapping.items():
            if k in q:
                keywords.append(k)
                if category not in interests:
                    interests.append(category)

        if not interests:
            interests = ["Local Culture", "Street Food"]

        return ParsedTravelIntent(
            destination=dest,
            available_time_hours=hours,
            budget_inr=budget,
            traveler_count=traveler_count,
            group_type=group_type,
            interests=interests,
            desired_experience_count=places_count,
            keywords=keywords or ["local experience"],
            vibe_summary=f"{hours:g}-hour travel plan for {group_type} within ₹{budget:g}",
        )

    @classmethod
    def execute_smart_search(cls, request: SmartSearchRequest) -> SmartSearchResponse:
        """
        Full end-to-end execution:
        1. Parses natural language query via Groq LLM
        2. Scores and ranks candidate experiences using the ML Recommendation Engine
        3. Boosts candidates matching the extracted keywords
        4. Returns structured results ready for the recommendation swipe interface
        """
        intent = cls.parse_intent_with_groq(request.query)

        # Build recommendation request from parsed intent
        rec_req = RecommendationRequest(
            destination=intent.destination or request.city or None,
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

        rec_response = RecommendationService.get_recommendations(rec_req)
        items = rec_response.recommendations

        # Keyword Boost Ranking:
        # Boost experiences whose names, descriptions, or tags match the extracted keywords
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
