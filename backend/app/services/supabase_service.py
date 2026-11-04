"""
Supabase Data Access & Synchronization Service.
Connects to Supabase experience table and provides real-time / cached experience records.
"""
from typing import Any, Dict, List, Optional, Tuple
import json
import logging
import os
import re
import urllib.request
import urllib.error
import pandas as pd

logger = logging.getLogger(__name__)


class SupabaseService:
    """
    Manages communication with the Supabase experience table.
    """

    _cached_df: Optional[pd.DataFrame] = None

    @classmethod
    def get_credentials(cls) -> Tuple[str, str]:
        url = os.getenv("SUPABASE_URL", "https://mvokdnefwukzouuttsvz.supabase.co").strip()
        key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("SUPABASE_ANON_KEY")
            or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12b2tkbmVmd3Vrem91dXR0c3Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTA1NzksImV4cCI6MjEwNTkyNjU3OX0.KsNjS6EP6hyw2-JZlKgvV3AdqpZudVGCI7guH0YE9w4"
        ).strip()
        return url, key

    @classmethod
    def get_experience_dataframe(cls, force_refresh: bool = False) -> Optional[pd.DataFrame]:
        """
        Returns cached DataFrame if available, or fetches live from Supabase.
        """
        if cls._cached_df is not None and not force_refresh:
            return cls._cached_df
        return cls.fetch_experiences_from_supabase()

    @classmethod
    def fetch_experiences_from_supabase(cls) -> Optional[pd.DataFrame]:
        """
        Fetch all records from Supabase 'experience' table via REST API.
        """
        url, key = cls.get_credentials()
        if not url or not key:
            logger.warning("Supabase URL or Key not configured.")
            return None

        # Fetch using PostgREST endpoint with Range header to permit large payloads
        endpoint = f"{url}/rest/v1/experience?select=*"
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            "Range": "0-9999",
        }

        try:
            req = urllib.request.Request(endpoint, headers=headers)
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status in (200, 206):
                    data = json.loads(resp.read().decode("utf-8"))
                    if data and len(data) > 0:
                        df = pd.DataFrame(data)
                        df = cls._normalize_supabase_dataframe(df)
                        cls._cached_df = df
                        logger.info(f"Successfully loaded and normalized {len(df)} experiences from Supabase.")
                        return df
                    else:
                        logger.info("Supabase experience table returned 0 rows.")
        except Exception as e:
            logger.warning(f"Failed to query Supabase experience table (using local cache/seed fallback): {e}")

        return None

    @classmethod
    def _normalize_supabase_dataframe(cls, df: pd.DataFrame) -> pd.DataFrame:
        """
        Map and clean Supabase columns to match ML feature requirements.
        Handles provider entries with strings (currency symbols, commas, text duration, etc.)
        """
        def _clean_numeric(val, default=0.0):
            if val is None or pd.isna(val):
                return default
            if isinstance(val, (int, float)):
                return float(val)
            s = str(val).strip().replace(",", "")
            m = re.search(r"[-+]?\d*\.?\d+", s)
            if m:
                try:
                    return float(m.group(0))
                except Exception:
                    pass
            return default

        def _to_bool_int(val, default=1):
            if val is None or pd.isna(val):
                return default
            if isinstance(val, (bool, int, float)):
                return int(bool(val))
            s = str(val).strip().lower()
            return 1 if s in ("true", "1", "yes", "y", "t") else 0

        # Clean price_inr & price_inr_clean
        if "price_inr" in df.columns:
            df["price_inr"] = df["price_inr"].apply(lambda v: _clean_numeric(v, 0.0))
            df["price_inr_clean"] = df["price_inr"]
        elif "price_inr_clean" in df.columns:
            df["price_inr_clean"] = df["price_inr_clean"].apply(lambda v: _clean_numeric(v, 0.0))
            df["price_inr"] = df["price_inr_clean"]

        # Clean duration_hours & duration_hours_clean
        if "duration_hours" in df.columns:
            df["duration_hours"] = df["duration_hours"].apply(lambda v: _clean_numeric(v, 1.0))
            df["duration_hours_clean"] = df["duration_hours"]
        elif "duration_hours_clean" in df.columns:
            df["duration_hours_clean"] = df["duration_hours_clean"].apply(lambda v: _clean_numeric(v, 1.0))
            df["duration_hours"] = df["duration_hours_clean"]

        # Clean rating & rating_missing
        if "rating" in df.columns:
            df["rating"] = pd.to_numeric(df["rating"], errors="coerce")
            df["rating_missing"] = df["rating"].isna().astype(int)
        else:
            df["rating"] = None
            df["rating_missing"] = 1

        # Clean group sizes
        if "min_group_size" in df.columns:
            df["min_group_size"] = df["min_group_size"].apply(lambda v: _clean_numeric(v, 1.0))
        if "max_group_size" in df.columns:
            df["max_group_size"] = df["max_group_size"].apply(lambda v: _clean_numeric(v, 999.0))

        # Clean local_experience & local_experience_bool
        if "local_experience_bool" in df.columns:
            df["local_experience_bool"] = df["local_experience_bool"].apply(lambda v: _to_bool_int(v, 1))
            df["local_experience"] = df["local_experience_bool"].astype(bool)
        elif "local_experience" in df.columns:
            df["local_experience_bool"] = df["local_experience"].apply(lambda v: _to_bool_int(v, 1))
            df["local_experience"] = df["local_experience_bool"].astype(bool)
        else:
            df["local_experience_bool"] = 1
            df["local_experience"] = True

        # Clean hidden_gem & hidden_gem_bool
        if "hidden_gem_bool" in df.columns:
            df["hidden_gem_bool"] = df["hidden_gem_bool"].apply(lambda v: _to_bool_int(v, 0))
            df["hidden_gem"] = df["hidden_gem_bool"].astype(bool)
        elif "hidden_gem" in df.columns:
            df["hidden_gem_bool"] = df["hidden_gem"].apply(lambda v: _to_bool_int(v, 0))
            df["hidden_gem"] = df["hidden_gem_bool"].astype(bool)
        else:
            df["hidden_gem_bool"] = 0
            df["hidden_gem"] = False

        # Clean indoor_outdoor & indoor_outdoor_clean
        if "indoor_outdoor" in df.columns:
            df["indoor_outdoor_clean"] = df["indoor_outdoor"].fillna("Flexible").astype(str)
            df["indoor_outdoor"] = df["indoor_outdoor_clean"]
        elif "indoor_outdoor_clean" in df.columns:
            df["indoor_outdoor"] = df["indoor_outdoor_clean"].fillna("Flexible").astype(str)
        else:
            df["indoor_outdoor"] = "Flexible"
            df["indoor_outdoor_clean"] = "Flexible"

        # Coordinates clean
        if "latitude" in df.columns:
            df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
        if "longitude" in df.columns:
            df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

        # Review count
        if "review_count" in df.columns:
            df["review_count"] = df["review_count"].apply(lambda v: _clean_numeric(v, 0.0)).astype(int)

        return df
