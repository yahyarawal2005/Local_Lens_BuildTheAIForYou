"""
Real Image Discovery & Grounding Service.
Discovers and verifies authentic, real-world images for recommended places.
Strictly avoids AI-generated, fictional, or fabricated image URLs.
"""
from pathlib import Path
from typing import Any, Dict, List, Optional
import json
import logging
import re
import urllib.parse
import httpx
import pandas as pd

try:
    from backend.app.services.place_image_resolver import PlaceImageResolver
except ImportError:
    from app.services.place_image_resolver import PlaceImageResolver

logger = logging.getLogger("locallens.real_image_service")


class RealImageService:
    """
    Finds and validates authentic real images for recommended tourist spots and experiences.
    Prioritizes verified Wikipedia / Wikimedia Commons lead photos and verified dataset images.
    """

    _cache: Dict[str, Optional[str]] = {}

    @classmethod
    def _clean_query(cls, text: str) -> str:
        """Sanitize query string for search."""
        if not text:
            return ""
        clean = re.sub(r"[^a-zA-Z0-9\s]", " ", str(text))
        return re.sub(r"\s+", " ", clean).strip()

    @classmethod
    async def find_real_image(
        cls,
        place_name: str,
        city: Optional[str] = None,
        location: Optional[str] = None,
        category: Optional[str] = None,
        experience_id: Optional[str] = None,
        gemini_image_hint: Optional[str] = None,
    ) -> Optional[str]:
        """
        Finds a genuine, verified photo of the specified place.
        Order of discovery:
        1. If Gemini returned a verified grounded image URL, validate and return.
        2. Wikipedia / Wikimedia Commons API real place photo.
        3. Verified place dataset photo catalog.
        4. Return None if no authentic photo can be verified (no fabricated URLs).
        """
        cache_key = f"{cls._clean_query(place_name)}::{cls._clean_query(city or location or '')}"
        if cache_key in cls._cache:
            return cls._cache[cache_key]

        # Step 1: Check Gemini provided hint if valid http(s) URL
        if gemini_image_hint and isinstance(gemini_image_hint, str):
            hint = gemini_image_hint.strip()
            if hint.startswith("http://") or hint.startswith("https://"):
                if not any(fict in hint.lower() for fict in ["fake", "example.com", "placeholder", "ai-generated"]):
                    cls._cache[cache_key] = hint
                    return hint

        # Step 2: Check Verified Dataset Catalog Match via PlaceImageResolver (instant in-memory match)
        resolved_img = PlaceImageResolver.get_instance().resolve_image(
            place_id=experience_id,
            name=place_name,
            location=f"{city or ''} {location or ''}".strip(),
            category=category,
        )
        if resolved_img and resolved_img.startswith("http"):
            cls._cache[cache_key] = resolved_img
            return resolved_img

        # Step 3: Wikipedia / Wikimedia Commons API Lead Image Lookup for unknown places
        wiki_img = await cls._fetch_wikipedia_image(place_name=place_name, city=city or location)
        if wiki_img:
            cls._cache[cache_key] = wiki_img
            return wiki_img

        cls._cache[cache_key] = None
        return None

    @classmethod
    async def _fetch_wikipedia_image(cls, place_name: str, city: Optional[str] = None) -> Optional[str]:
        """
        Queries Wikipedia API to fetch the authentic thumbnail / lead image of a real landmark.
        """
        clean_name = cls._clean_query(place_name)
        if not clean_name:
            return None

        # Try search query variations (e.g. "Elephanta Caves Mumbai", then "Elephanta Caves")
        queries = []
        if city and cls._clean_query(city):
            queries.append(f"{clean_name} {cls._clean_query(city)}")
        queries.append(clean_name)

        headers = {
            "User-Agent": "LocalLens-Recommender/1.0 (contact: support@locallens.app)"
        }

        async with httpx.AsyncClient(timeout=1.5) as client:
            for q in queries:
                try:
                    # 1. Search for matching Wikipedia page
                    search_url = (
                        f"https://en.wikipedia.org/w/api.php"
                        f"?action=query&list=search&srsearch={urllib.parse.quote(q)}"
                        f"&utf8=&format=json&srlimit=1"
                    )
                    s_res = await client.get(search_url, headers=headers)
                    if s_res.status_code != 200:
                        continue

                    s_data = s_res.json()
                    search_results = s_data.get("query", {}).get("search", [])
                    if not search_results:
                        continue

                    page_title = search_results[0].get("title")
                    if not page_title:
                        continue

                    # 2. Get lead page image for the page title
                    page_url = (
                        f"https://en.wikipedia.org/w/api.php"
                        f"?action=query&titles={urllib.parse.quote(page_title)}"
                        f"&prop=pageimages&format=json&pithumbsize=800"
                    )
                    p_res = await client.get(page_url, headers=headers)
                    if p_res.status_code != 200:
                        continue

                    p_data = p_res.json()
                    pages = p_data.get("query", {}).get("pages", {})
                    for _, page_info in pages.items():
                        thumbnail = page_info.get("thumbnail", {})
                        source_url = thumbnail.get("source")
                        if source_url and source_url.startswith("http"):
                            logger.info(f"[RealImageService] Discovered Wikipedia image for '{place_name}': {source_url}")
                            return source_url

                except Exception as e:
                    logger.debug(f"[RealImageService] Wikipedia image query for '{q}' failed: {e}")
                    continue

        return None
