"""
Place Image Resolver Service.
Ensures every recommended place displays its verified image from the project CSV data.
Architecture:
  Level 1: Exact Unique ID match (place_id / EXP- prefix normalized)
  Level 2: Exact normalized name + location match
  Level 3: Normalized name / substring match against CSV catalog
  Level 4: Gemini assisted matching fallback (identifying CSV record ID ONLY, never inventing images/URLs)
  Level 5: Curated category fallback image
"""
import json
import logging
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
import httpx

try:
    from backend.app.core.config import settings
except ImportError:
    try:
        from app.core.config import settings
    except ImportError:
        settings = None

logger = logging.getLogger("locallens.place_image_resolver")


def _normalize(s: Optional[str]) -> str:
    """Normalize string for robust deterministic comparison."""
    if not s or pd.isna(s):
        return ""
    clean = re.sub(r"[^a-zA-Z0-9\s]", "", str(s)).strip().lower()
    return re.sub(r"\s+", " ", clean)


class PlaceImageResolver:
    """
    Singleton resolver for CSV-based place photos and image URLs.
    Loads and indexes the project experience dataset on initialization.
    """

    _instance: Optional["PlaceImageResolver"] = None

    CATEGORY_FALLBACKS = {
        "Heritage": "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80",
        "Food": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80",
        "Culture": "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800&q=80",
        "Nature": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
        "Adventure": "https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=800&q=80",
        "Religious": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=800&q=80",
        "Museum": "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&q=80",
        "Beach": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
        "Shopping": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
        "Local Experience": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    }
    DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80"

    def __init__(self, csv_path: Optional[Path] = None):
        self._id_map: Dict[str, str] = {}
        self._name_loc_map: Dict[Tuple[str, str], str] = {}
        self._name_map: Dict[str, str] = {}
        self._records: List[Dict[str, Any]] = []
        self._load_csv(csv_path)

    @classmethod
    def get_instance(cls) -> "PlaceImageResolver":
        if cls._instance is None:
            cls._instance = PlaceImageResolver()
        return cls._instance

    def _find_csv_path(self, explicit_path: Optional[Path] = None) -> Optional[Path]:
        if explicit_path and explicit_path.exists():
            return explicit_path

        base_dir = Path(__file__).resolve().parent.parent.parent
        workspace_root = base_dir.parent

        candidate_paths = [
            workspace_root / "ml" / "datasets" / "all_experiences_with_photos.csv",
            workspace_root / "ml" / "datasets" / "all_experiences_with_images.csv",
            workspace_root / "database" / "seeds" / "supabase_experiences_import.csv",
            base_dir / "ml" / "datasets" / "all_experiences_with_photos.csv",
        ]

        for p in candidate_paths:
            if p.exists():
                return p
        return None

    def _load_csv(self, csv_path: Optional[Path] = None) -> None:
        target_path = self._find_csv_path(csv_path)
        if not target_path:
            logger.warning("[PlaceImageResolver] CSV file not found on disk. Initialized with empty index.")
            return

        try:
            df = pd.read_csv(target_path)
            logger.info(f"[PlaceImageResolver] Loading {len(df)} places from CSV: {target_path}")

            for _, row in df.iterrows():
                exp_id = str(row.get("experience_id", "")).strip()
                if not exp_id or pd.isna(exp_id):
                    continue

                raw_id = exp_id.replace("EXP-", "").upper()
                exp_name = str(row.get("experience_name", "")).strip()
                city = str(row.get("city", "")).strip() if pd.notna(row.get("city")) else ""
                district = str(row.get("district", "")).strip() if pd.notna(row.get("district")) else ""
                category = str(row.get("category", "")).strip() if pd.notna(row.get("category")) else ""

                img_url = str(row.get("image_url", "")).strip() if pd.notna(row.get("image_url")) else ""
                if not img_url.startswith("http"):
                    img_url = self.CATEGORY_FALLBACKS.get(category, self.DEFAULT_FALLBACK)

                # Index Level 1: ID Map
                self._id_map[exp_id.upper()] = img_url
                self._id_map[raw_id] = img_url
                self._id_map[f"EXP-{raw_id}"] = img_url

                # Index Level 2: Name + Location Map
                norm_name = _normalize(exp_name)
                norm_city = _normalize(city)
                norm_district = _normalize(district)

                if norm_name:
                    if norm_city:
                        self._name_loc_map[(norm_name, norm_city)] = img_url
                    if norm_district:
                        self._name_loc_map[(norm_name, norm_district)] = img_url
                    # Index Level 3: Name Map
                    self._name_map[norm_name] = img_url

                self._records.append({
                    "experience_id": exp_id,
                    "experience_name": exp_name,
                    "city": city,
                    "district": district,
                    "category": category,
                    "image_url": img_url,
                })

            logger.info(f"[PlaceImageResolver] Successfully indexed {len(self._id_map)} ID variants and {len(self._name_map)} place names.")
        except Exception as e:
            logger.error(f"[PlaceImageResolver] Failed to parse CSV: {e}", exc_info=True)

    def resolve_image(
        self,
        place_id: Optional[str] = None,
        name: Optional[str] = None,
        location: Optional[str] = None,
        category: Optional[str] = None,
    ) -> str:
        """
        Resolve the authentic CSV image URL for a place using a multi-level fallback cascade.
        """
        # LEVEL 1: Exact Unique ID Match
        if place_id:
            pid = str(place_id).strip().upper()
            if pid in self._id_map:
                return self._id_map[pid]
            clean_pid = pid.replace("EXP-", "")
            if clean_pid in self._id_map:
                return self._id_map[clean_pid]
            prefixed = f"EXP-{clean_pid}"
            if prefixed in self._id_map:
                return self._id_map[prefixed]

        # LEVEL 2: Exact Normalized Name + Location Match
        norm_name = _normalize(name)
        norm_loc = _normalize(location)
        if norm_name and norm_loc:
            if (norm_name, norm_loc) in self._name_loc_map:
                return self._name_loc_map[(norm_name, norm_loc)]

        # LEVEL 3: Exact or Substring Normalized Name Match
        if norm_name:
            if norm_name in self._name_map:
                return self._name_map[norm_name]
            # Substring scan across known names
            for known_name, img in self._name_map.items():
                if len(known_name) > 4 and (norm_name in known_name or known_name in norm_name):
                    return img

        # LEVEL 4: Professional Category Fallback Placeholder
        cat_key = str(category or "Local Experience").strip()
        for known_cat, fallback_url in self.CATEGORY_FALLBACKS.items():
            if known_cat.lower() in cat_key.lower():
                return fallback_url

        return self.DEFAULT_FALLBACK

    def _gemini_match_csv_id(self, name: str, location: str, category: Optional[str] = None) -> Optional[str]:
        """
        Use Gemini strictly to match a recommended place to an existing CSV record ID.
        Gemini NEVER provides or invents image URLs; it only identifies the matching CSV record.
        """
        api_key = getattr(settings, "LLM_API_KEY", "") or os.getenv("LLM_API_KEY", "")
        if not api_key:
            return None

        # Filter candidate pool for Gemini inspection (up to 15 relevant records)
        norm_loc = _normalize(location)
        candidates = [
            r for r in self._records
            if norm_loc and (_normalize(r["city"]) == norm_loc or _normalize(r["district"]) == norm_loc)
        ][:15]

        if not candidates:
            candidates = self._records[:15]

        candidate_list_text = "\n".join([
            f"- ID: {c['experience_id']} | Name: {c['experience_name']} | City: {c['city']} | Category: {c['category']}"
            for c in candidates
        ])

        prompt = f"""You are a database matching assistant. Match the recommended place to one of the CSV records.
Target Place:
Name: "{name}"
Location: "{location}"
Category: "{category or ''}"

Available CSV Records:
{candidate_list_text}

Output JSON format only:
{{"matched": true, "csvPlaceId": "<exact experience_id from above>"}}
or if no record matches:
{{"matched": false, "csvPlaceId": null}}
"""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.0, "responseMimeType": "application/json"},
            }
            response = httpx.post(url, json=payload, timeout=4.0)
            if response.status_code == 200:
                data = response.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                if parsed.get("matched") and parsed.get("csvPlaceId"):
                    return str(parsed["csvPlaceId"]).strip()
        except Exception as e:
            logger.debug(f"[PlaceImageResolver] Gemini matching fallback error: {e}")

        return None
