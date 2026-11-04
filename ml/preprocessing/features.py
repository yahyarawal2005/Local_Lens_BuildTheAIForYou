"""
Feature engineering and preprocessing utilities for Local & Experiences ML layer.

Hard constraints: FEATURE_COLS must match the exact schema and ordering
expected by the trained ColumnTransformer in preprocessing_pipeline.pkl.
"""
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple, Union
import math
import numpy as np
import pandas as pd

NUMERIC_FEATURES = [
    "budget_inr",
    "available_time_hours",
    "traveler_count",
    "price_inr_clean",
    "duration_hours_clean",
    "rating",
    "price_diff",
    "time_diff",
    "interest_overlap_count",
    "interest_overlap_ratio",
]

BINARY_FEATURES = [
    "affordable",
    "fits_time",
    "group_size_ok",
    "local_experience_bool",
    "hidden_gem_bool",
    "rating_missing",
]

CATEGORICAL_FEATURES = [
    "group_type",
    "category",
    "sub_category",
    "indoor_outdoor_clean",
]

FEATURE_COLS = NUMERIC_FEATURES + BINARY_FEATURES + CATEGORICAL_FEATURES


def calculate_haversine_distance(
    lat1: Union[float, np.ndarray, pd.Series],
    lon1: Union[float, np.ndarray, pd.Series],
    lat2: Union[float, np.ndarray, pd.Series],
    lon2: Union[float, np.ndarray, pd.Series],
) -> Union[float, np.ndarray, pd.Series]:
    """
    Calculate the great circle distance in kilometers between two points
    on the earth (specified in decimal degrees). Supports both scalar floats
    and vectorized numpy arrays / pandas Series.
    """
    earth_radius_km = 6371.0

    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    delta_phi = np.radians(lat2 - lat1)
    delta_lambda = np.radians(lon2 - lon1)

    a = (
        np.sin(delta_phi / 2.0) ** 2
        + np.cos(phi1) * np.cos(phi2) * np.sin(delta_lambda / 2.0) ** 2
    )
    # Clip for floating point precision safety
    a = np.clip(a, 0.0, 1.0)
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    return earth_radius_km * c


def tokenize_interests(interests: Union[str, Iterable[str], None]) -> Set[str]:
    """
    Tokenize traveler interests split on '|' (or list/iterable of strings),
    stripped and lowercased.
    """
    if not interests:
        return set()
    if isinstance(interests, str):
        raw_tokens = interests.split("|")
    else:
        raw_tokens = []
        for item in interests:
            if isinstance(item, str):
                raw_tokens.extend(item.split("|"))
            elif item is not None:
                raw_tokens.append(str(item))

    return {tok.strip().lower() for tok in raw_tokens if tok and tok.strip()}


def tokenize_experience_tags(
    tags: Optional[str] = None,
    category: Optional[str] = None,
    best_for: Optional[str] = None,
) -> Set[str]:
    """
    Tokenize experience metadata (tags, category, best_for) split on ';',
    stripped and lowercased.
    """
    combined_parts: List[str] = []
    for field in (tags, category, best_for):
        if field is not None and not (isinstance(field, float) and math.isnan(field)):
            combined_parts.append(str(field))

    if not combined_parts:
        return set()

    full_str = ";".join(combined_parts)
    raw_tokens = full_str.split(";")
    return {tok.strip().lower() for tok in raw_tokens if tok and tok.strip()}


def compute_interest_overlap(
    traveler_interests: Union[str, Iterable[str], None],
    tags: Optional[str] = None,
    category: Optional[str] = None,
    best_for: Optional[str] = None,
) -> Tuple[int, float]:
    """
    Compute interest overlap count and ratio between traveler interests and experience tokens.
    - overlap_count = size of intersection between traveler tokens and experience tokens
    - overlap_ratio = overlap_count / number of traveler tokens (0.0 if traveler has no tokens)
    """
    traveler_tokens = tokenize_interests(traveler_interests)
    if not traveler_tokens:
        return 0, 0.0

    exp_tokens = tokenize_experience_tags(tags, category, best_for)
    intersection = traveler_tokens.intersection(exp_tokens)
    overlap_count = len(intersection)
    overlap_ratio = float(overlap_count) / float(len(traveler_tokens))
    return overlap_count, overlap_ratio


def build_feature_dataframe(
    traveler_request: Dict[str, Any],
    experiences_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Vectorized feature engineering turning a traveler request dict and
    candidate experiences DataFrame into a FEATURE_COLS-shaped DataFrame
    ready for ColumnTransformer.transform().

    Traveler request keys:
      - budget_inr: float
      - available_time_hours: float
      - traveler_count: int
      - group_type: str
      - interests: str or List[str]

    Experiences DataFrame columns expected:
      - price_inr_clean: float
      - duration_hours_clean: float
      - rating: float (or NaN)
      - min_group_size: float/int
      - max_group_size: float/int (can be NaN for unlimited)
      - local_experience_bool: bool/int
      - hidden_gem_bool: bool/int
      - rating_missing: bool/int
      - category: str
      - sub_category: str
      - indoor_outdoor_clean: str
      - tags: str (optional)
      - best_for: str (optional)
    """
    budget_inr = float(traveler_request.get("budget_inr", 0.0))
    available_time_hours = float(traveler_request.get("available_time_hours", 0.0))
    traveler_count = int(traveler_request.get("traveler_count", 1))
    group_type = str(traveler_request.get("group_type", "Solo"))
    interests = traveler_request.get("interests", "")

    n = len(experiences_df)
    if n == 0:
        return pd.DataFrame(columns=FEATURE_COLS)

    traveler_tokens = tokenize_interests(interests)
    num_traveler_tokens = len(traveler_tokens)

    # Pre-extract experience columns safely
    price_clean = experiences_df["price_inr_clean"].astype(float).values
    duration_clean = experiences_df["duration_hours_clean"].astype(float).values
    rating_vals = experiences_df["rating"].astype(float).values if "rating" in experiences_df.columns else np.full(n, np.nan)

    # Compute overlaps per row
    tags_col = experiences_df["tags"].fillna("").astype(str).values if "tags" in experiences_df.columns else np.full(n, "")
    cat_col = experiences_df["category"].fillna("").astype(str).values if "category" in experiences_df.columns else np.full(n, "")
    best_for_col = experiences_df["best_for"].fillna("").astype(str).values if "best_for" in experiences_df.columns else np.full(n, "")

    overlap_counts = np.zeros(n, dtype=int)
    overlap_ratios = np.zeros(n, dtype=float)

    if num_traveler_tokens > 0:
        for idx in range(n):
            exp_toks = tokenize_experience_tags(tags_col[idx], cat_col[idx], best_for_col[idx])
            common = traveler_tokens.intersection(exp_toks)
            c = len(common)
            overlap_counts[idx] = c
            overlap_ratios[idx] = float(c) / float(num_traveler_tokens)

    # Derived numeric features
    price_diff = budget_inr - price_clean
    time_diff = available_time_hours - duration_clean

    # Derived binary features
    affordable = (price_clean <= budget_inr).astype(int)
    fits_time = (duration_clean <= available_time_hours).astype(int)

    # group_size_ok logic: [min_group_size, max_group_size], missing max is unlimited
    min_grp = experiences_df["min_group_size"].fillna(1).astype(float).values if "min_group_size" in experiences_df.columns else np.ones(n)
    min_grp = np.where(min_grp <= 0, 1.0, min_grp)
    if "max_group_size" in experiences_df.columns:
        max_grp = experiences_df["max_group_size"].values
        max_grp_ok = np.isnan(max_grp) | (traveler_count <= max_grp)
    else:
        max_grp_ok = np.ones(n, dtype=bool)

    group_size_ok = ((traveler_count >= min_grp) & max_grp_ok).astype(int)

    # Experience boolean columns cast cleanly
    local_bool = (
        experiences_df["local_experience_bool"].fillna(False).astype(bool).astype(int).values
        if "local_experience_bool" in experiences_df.columns
        else np.zeros(n, dtype=int)
    )
    hidden_gem = (
        experiences_df["hidden_gem_bool"].fillna(False).astype(bool).astype(int).values
        if "hidden_gem_bool" in experiences_df.columns
        else np.zeros(n, dtype=int)
    )
    rating_missing = (
        experiences_df["rating_missing"].fillna(True).astype(bool).astype(int).values
        if "rating_missing" in experiences_df.columns
        else np.isnan(rating_vals).astype(int)
    )

    # Categorical columns
    cat_feature = experiences_df["category"].fillna("General").astype(str).values if "category" in experiences_df.columns else np.full(n, "General")
    sub_cat_feature = experiences_df["sub_category"].fillna("General").astype(str).values if "sub_category" in experiences_df.columns else np.full(n, "General")
    indoor_outdoor = experiences_df["indoor_outdoor_clean"].fillna("Flexible").astype(str).values if "indoor_outdoor_clean" in experiences_df.columns else np.full(n, "Flexible")

    feature_data = {
        # NUMERIC_FEATURES
        "budget_inr": np.full(n, budget_inr, dtype=float),
        "available_time_hours": np.full(n, available_time_hours, dtype=float),
        "traveler_count": np.full(n, traveler_count, dtype=int),
        "price_inr_clean": price_clean,
        "duration_hours_clean": duration_clean,
        "rating": rating_vals,
        "price_diff": price_diff,
        "time_diff": time_diff,
        "interest_overlap_count": overlap_counts,
        "interest_overlap_ratio": overlap_ratios,
        # BINARY_FEATURES
        "affordable": affordable,
        "fits_time": fits_time,
        "group_size_ok": group_size_ok,
        "local_experience_bool": local_bool,
        "hidden_gem_bool": hidden_gem,
        "rating_missing": rating_missing,
        # CATEGORICAL_FEATURES
        "group_type": np.full(n, group_type, dtype=object),
        "category": cat_feature,
        "sub_category": sub_cat_feature,
        "indoor_outdoor_clean": indoor_outdoor,
    }

    df = pd.DataFrame(feature_data)
    # Ensure exact column order
    return df[FEATURE_COLS]
