"""
Provider Experience Quality and Listing Validation Engine.

NOTE ON RETRAINING:
No model retraining is required when new experiences are registered by providers.
The scoring engine evaluates dynamic engineered features (e.g. price difference,
time difference, keyword overlap, availability flags) rather than memorizing static
experience IDs. Furthermore, the preprocessing ColumnTransformer utilizes
OneHotEncoder(handle_unknown="ignore"), which gracefully and safely handles any
previously unseen category or sub_category values at runtime without error.
"""
from typing import Any, Dict, List, Optional, Tuple, Union
import logging
import os
from pathlib import Path
import threading
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class ValidationError(ValueError):
    """Raised when an experience submission fails sanity or schema validation."""
    pass


class ExperienceValidator:
    """
    Validates, sanitizes, and registers new provider experience listings.
    Updates both the live in-memory candidate dataset and persists to disk.
    """

    def __init__(
        self,
        dataset_path: Optional[Union[str, Path]] = None,
    ):
        base_dir = Path(__file__).resolve().parent.parent
        self.dataset_path = (
            Path(dataset_path)
            if dataset_path
            else Path(os.getenv("DATASET_DIR", base_dir / "datasets")) / "all_experiences_cleaned.csv"
        )
        self._lock = threading.Lock()

    def validate_submission(self, submission: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate provider submission dictionary against required fields and sanity constraints.

        Constraints:
          - experience_name: non-empty string
          - category: non-empty string
          - price_inr / price: float >= 0
          - duration_hours / duration: float > 0
          - latitude: -90.0 <= lat <= 90.0
          - longitude: -180.0 <= lon <= 180.0
          - city: non-empty string
          - min_group_size: >= 1 (if provided)
          - max_group_size: >= min_group_size (if provided)
        """
        errors: List[str] = []

        # Name validation
        name = submission.get("experience_name", "").strip()
        if not name:
            errors.append("experience_name must be a non-empty string.")

        # Category validation
        category = submission.get("category", "").strip()
        if not category:
            errors.append("category must be a non-empty string.")

        # Price validation (>= 0)
        raw_price = submission.get("price_inr_clean", submission.get("price_inr", submission.get("price")))
        if raw_price is None:
            errors.append("price_inr is required.")
            price_val = 0.0
        else:
            try:
                price_val = float(raw_price)
                if price_val < 0:
                    errors.append("price_inr must be non-negative (>= 0).")
            except (ValueError, TypeError):
                errors.append("price_inr must be a valid numeric value.")
                price_val = 0.0

        # Duration validation (> 0)
        raw_dur = submission.get("duration_hours_clean", submission.get("duration_hours", submission.get("duration")))
        if raw_dur is None:
            errors.append("duration_hours is required.")
            dur_val = 1.0
        else:
            try:
                dur_val = float(raw_dur)
                if dur_val <= 0:
                    errors.append("duration_hours must be strictly positive (> 0).")
            except (ValueError, TypeError):
                errors.append("duration_hours must be a valid numeric value.")
                dur_val = 1.0

        # Lat / Lon validation
        raw_lat = submission.get("latitude", submission.get("lat"))
        raw_lon = submission.get("longitude", submission.get("lon"))
        lat_val: Optional[float] = None
        lon_val: Optional[float] = None

        if raw_lat is not None:
            try:
                lat_val = float(raw_lat)
                if not (-90.0 <= lat_val <= 90.0):
                    errors.append("latitude must be between -90.0 and 90.0.")
            except (ValueError, TypeError):
                errors.append("latitude must be a valid float.")

        if raw_lon is not None:
            try:
                lon_val = float(raw_lon)
                if not (-180.0 <= lon_val <= 180.0):
                    errors.append("longitude must be between -180.0 and 180.0.")
            except (ValueError, TypeError):
                errors.append("longitude must be a valid float.")

        # City validation
        city = str(submission.get("city", "")).strip()
        if not city:
            errors.append("city must be a non-empty string.")

        # Group size validation
        min_grp = submission.get("min_group_size", 1)
        try:
            min_grp = int(min_grp) if min_grp is not None else 1
            if min_grp < 1:
                errors.append("min_group_size must be at least 1.")
        except (ValueError, TypeError):
            errors.append("min_group_size must be an integer.")
            min_grp = 1

        max_grp = submission.get("max_group_size")
        if max_grp is not None and not (isinstance(max_grp, float) and np.isnan(max_grp)):
            try:
                max_grp = int(max_grp)
                if max_grp < min_grp:
                    errors.append(f"max_group_size ({max_grp}) cannot be smaller than min_group_size ({min_grp}).")
            except (ValueError, TypeError):
                errors.append("max_group_size must be an integer or None.")
                max_grp = None
        else:
            max_grp = None

        # Compulsory image validation (image of shop or experience listing)
        raw_image = (
            submission.get("image_url")
            or submission.get("shop_image")
            or submission.get("image")
            or submission.get("images")
            or submission.get("photos")
            or submission.get("photo")
        )
        image_str = ""
        if isinstance(raw_image, list):
            valid_imgs = [str(x).strip() for x in raw_image if str(x).strip()]
            if valid_imgs:
                image_str = valid_imgs[0]
        elif isinstance(raw_image, str):
            image_str = raw_image.strip()

        if not image_str:
            errors.append("An image of the shop or experience listing is compulsory.")

        # AI quality check score validation (minimum 50 required to publish/register)
        raw_quality = submission.get("quality_score", submission.get("ai_quality_score", submission.get("health_score")))
        if raw_quality is not None:
            try:
                q_score = float(raw_quality)
                if q_score < 50.0:
                    errors.append(f"AI quality check score ({q_score:.0f}) is below 50. Minimum 50 required to publish listing.")
            except (ValueError, TypeError):
                errors.append("quality_score must be a valid numeric score (0-100).")

        if errors:
            raise ValidationError(f"Validation failed: {'; '.join(errors)}")

        # Build sanitized normalized dict
        sanitized = {
            "experience_name": name,
            "category": category,
            "sub_category": str(submission.get("sub_category", category)).strip() or category,
            "city": city,
            "district": str(submission.get("district", "")).strip() or None,
            "state": str(submission.get("state", "")).strip() or None,
            "region": str(submission.get("region", "")).strip() or None,
            "description": str(submission.get("description", "")).strip(),
            "tags": str(submission.get("tags", "")).strip(),
            "best_for": str(submission.get("best_for", "")).strip(),
            "price_inr": price_val,
            "price_inr_clean": price_val,
            "duration_hours": dur_val,
            "duration_hours_clean": dur_val,
            "latitude": lat_val,
            "longitude": lon_val,
            "min_group_size": min_grp,
            "max_group_size": max_grp,
            "max_group_size_missing": bool(max_grp is None),
            "rating": float(submission["rating"]) if submission.get("rating") is not None else np.nan,
            "rating_missing": bool(submission.get("rating") is None),
            "review_count": int(submission["review_count"]) if submission.get("review_count") is not None else np.nan,
            "review_count_missing": bool(submission.get("review_count") is None),
            "indoor_outdoor": str(submission.get("indoor_outdoor", "Flexible")),
            "indoor_outdoor_clean": str(submission.get("indoor_outdoor_clean", submission.get("indoor_outdoor", "Flexible"))),
            "local_experience": str(submission.get("local_experience", "Yes")),
            "local_experience_bool": bool(submission.get("local_experience_bool", True)),
            "hidden_gem": str(submission.get("hidden_gem", "No")),
            "hidden_gem_bool": bool(submission.get("hidden_gem_bool", False)),
            "booking_required": str(submission.get("booking_required", "No")),
            "booking_required_bool": bool(submission.get("booking_required_bool", False)),
            "advance_booking_days": int(submission.get("advance_booking_days", 0)),
            "advance_booking_days_clean": float(submission.get("advance_booking_days_clean", 0.0)),
            "image_url": image_str,
            "shop_image": image_str,
            "images": [str(x).strip() for x in raw_image if str(x).strip()] if isinstance(raw_image, list) and len(raw_image) > 0 else ([image_str] if image_str else []),
        }
        return sanitized

    def generate_experience_id(self, city: str, current_df: Optional[pd.DataFrame] = None) -> str:
        """
        Generate a unique experience ID prefixed with city abbreviation (e.g. DEL-758, MUM-102).
        """
        city_clean = city.strip().upper()
        prefix = city_clean[:3] if len(city_clean) >= 3 else (city_clean + "EXP")[:3]

        if current_df is None or current_df.empty:
            if self.dataset_path.exists():
                current_df = pd.read_csv(self.dataset_path)
            else:
                current_df = pd.DataFrame(columns=["experience_id"])

        if "experience_id" in current_df.columns:
            existing_ids = current_df["experience_id"].dropna().astype(str).tolist()
            matching_nums: List[int] = []
            for eid in existing_ids:
                if eid.startswith(f"{prefix}-"):
                    parts = eid.split("-")
                    if len(parts) >= 2 and parts[-1].isdigit():
                        matching_nums.append(int(parts[-1]))
            next_num = (max(matching_nums) + 1) if matching_nums else 1
        else:
            next_num = 1

        return f"{prefix}-{next_num:03d}"

    def register_experience(
        self,
        submission: Dict[str, Any],
        recommendation_engine: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Validate submission, generate unique ID, update in-memory engine,
        and append to CSV dataset preserving all schema columns.
        """
        sanitized = self.validate_submission(submission)

        with self._lock:
            # Read current dataset to ensure unique ID and schema alignment
            if self.dataset_path.exists():
                df = pd.read_csv(self.dataset_path)
            else:
                df = pd.DataFrame()

            experience_id = submission.get("experience_id")
            if not experience_id:
                experience_id = self.generate_experience_id(sanitized["city"], df)
            sanitized["experience_id"] = experience_id

            # Align columns to existing CSV schema without dropping any sanitized columns
            if not df.empty:
                all_cols = list(dict.fromkeys(list(df.columns) + list(sanitized.keys())))
                for col in all_cols:
                    if col not in df.columns:
                        df[col] = np.nan
                full_row = {col: sanitized.get(col, np.nan) for col in all_cols}
                row_df = pd.DataFrame([full_row])
                updated_df = pd.concat([df, row_df], ignore_index=True)
            else:
                row_df = pd.DataFrame([sanitized])
                updated_df = row_df

            # Persist to disk atomically
            self.dataset_path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = self.dataset_path.with_suffix(".tmp.csv")
            updated_df.to_csv(temp_path, index=False)
            if os.name == "nt" and self.dataset_path.exists():
                # On Windows, replace requires removing destination first if atomic replace fails
                try:
                    os.replace(temp_path, self.dataset_path)
                except OSError:
                    os.remove(self.dataset_path)
                    os.rename(temp_path, self.dataset_path)
            else:
                os.replace(temp_path, self.dataset_path)

            logger.info(f"Appended experience {experience_id} to {self.dataset_path}")

            # Update recommendation engine in-memory dataset if provided
            if recommendation_engine is not None:
                recommendation_engine.add_experience_in_memory(sanitized)
                logger.info(f"Updated in-memory experiences in RecommendationEngine (new total: {len(recommendation_engine.experiences_df)})")

        return sanitized
