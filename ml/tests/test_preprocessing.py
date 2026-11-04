"""
Unit tests for feature engineering and preprocessing.
"""
import numpy as np
import pandas as pd
import pytest

from ml.preprocessing.features import (
    BINARY_FEATURES,
    CATEGORICAL_FEATURES,
    FEATURE_COLS,
    NUMERIC_FEATURES,
    build_feature_dataframe,
    calculate_haversine_distance,
    compute_interest_overlap,
    tokenize_experience_tags,
    tokenize_interests,
)


def test_tokenize_interests():
    # String input
    assert tokenize_interests("Food | Heritage | Art") == {"food", "heritage", "art"}
    # Leading/trailing whitespace and mixed case
    assert tokenize_interests("  Music|ADVENTURE | ") == {"music", "adventure"}
    # List input
    assert tokenize_interests(["Food | Culture", "Photography"]) == {"food", "culture", "photography"}
    # Empty / None
    assert tokenize_interests("") == set()
    assert tokenize_interests(None) == set()


def test_tokenize_experience_tags():
    tags = "Street Food; Mughlai; Heritage"
    cat = "Culinary"
    best_for = "Couples; Foodies"
    tokens = tokenize_experience_tags(tags, cat, best_for)
    assert tokens == {"street food", "mughlai", "heritage", "culinary", "couples", "foodies"}

    # Handles None or NaN gracefully
    tokens_nan = tokenize_experience_tags(None, "Adventure", float("nan"))
    assert tokens_nan == {"adventure"}


def test_compute_interest_overlap():
    traveler_interests = "Food | History | Nature"
    tags = "History; Ancient Architecture"
    cat = "Heritage"
    best_for = "Family; Nature Lovers"

    # Traveler: {'food', 'history', 'nature'}
    # Exp: {'history', 'ancient architecture', 'heritage', 'family', 'nature lovers'}
    # Intersection: {'history'} (size 1)
    count, ratio = compute_interest_overlap(traveler_interests, tags, cat, best_for)
    assert count == 1
    assert pytest.approx(ratio, 0.01) == 1.0 / 3.0

    # No overlap
    count_zero, ratio_zero = compute_interest_overlap("Nightlife | Gaming", tags, cat, best_for)
    assert count_zero == 0
    assert ratio_zero == 0.0

    # Empty traveler interests
    count_empty, ratio_empty = compute_interest_overlap("", tags, cat, best_for)
    assert count_empty == 0
    assert ratio_empty == 0.0


def test_haversine_distance():
    # Delhi (Connaught Place ~28.6315, 77.2167) to India Gate (~28.6129, 77.2295) -> approx 2.4 km
    d = calculate_haversine_distance(28.6315, 77.2167, 28.6129, 77.2295)
    assert 2.0 <= d <= 3.0

    # Same coordinates should be 0.0
    d_zero = calculate_haversine_distance(28.6129, 77.2295, 28.6129, 77.2295)
    assert pytest.approx(d_zero, abs=1e-5) == 0.0


def test_build_feature_dataframe_schema_and_flags():
    traveler = {
        "budget_inr": 1500.0,
        "available_time_hours": 3.0,
        "traveler_count": 2,
        "group_type": "Couple",
        "interests": "Heritage | Photography",
    }

    experiences = pd.DataFrame([
        {
            "experience_id": "EXP-1",
            "price_inr_clean": 1000.0,  # <= 1500 -> affordable = 1
            "duration_hours_clean": 2.0,  # <= 3 -> fits_time = 1
            "rating": 4.5,
            "min_group_size": 1,
            "max_group_size": 4,  # traveler_count 2 -> group_size_ok = 1
            "local_experience_bool": True,
            "hidden_gem_bool": False,
            "rating_missing": False,
            "category": "Heritage & Culture",
            "sub_category": "Walking Tour",
            "indoor_outdoor_clean": "Outdoor",
            "tags": "Heritage; Walking",
            "best_for": "Photography; Couples",
        },
        {
            "experience_id": "EXP-2",
            "price_inr_clean": 2500.0,  # > 1500 -> affordable = 0
            "duration_hours_clean": 5.0,  # > 3 -> fits_time = 0
            "rating": np.nan,
            "min_group_size": 3,
            "max_group_size": 10,  # traveler_count 2 < 3 -> group_size_ok = 0
            "local_experience_bool": False,
            "hidden_gem_bool": True,
            "rating_missing": True,
            "category": "Culinary",
            "sub_category": "Cooking Class",
            "indoor_outdoor_clean": "Indoor",
            "tags": "Food; Cooking",
            "best_for": "Foodies",
        },
    ])

    feat_df = build_feature_dataframe(traveler, experiences)

    # Verify column order and completeness
    assert list(feat_df.columns) == FEATURE_COLS

    # Verify row 1 features
    row0 = feat_df.iloc[0]
    assert row0["budget_inr"] == 1500.0
    assert row0["available_time_hours"] == 3.0
    assert row0["price_diff"] == 500.0
    assert row0["time_diff"] == 1.0
    assert row0["affordable"] == 1
    assert row0["fits_time"] == 1
    assert row0["group_size_ok"] == 1
    assert row0["local_experience_bool"] == 1
    assert row0["hidden_gem_bool"] == 0
    assert row0["rating_missing"] == 0
    assert row0["interest_overlap_count"] == 2  # 'heritage' and 'photography'
    assert pytest.approx(row0["interest_overlap_ratio"]) == 1.0
    assert row0["group_type"] == "Couple"

    # Verify row 2 features
    row1 = feat_df.iloc[1]
    assert row1["price_diff"] == -1000.0
    assert row1["time_diff"] == -2.0
    assert row1["affordable"] == 0
    assert row1["fits_time"] == 0
    assert row1["group_size_ok"] == 0
    assert row1["local_experience_bool"] == 0
    assert row1["hidden_gem_bool"] == 1
    assert row1["rating_missing"] == 1
    assert row1["interest_overlap_count"] == 0
    assert row1["interest_overlap_ratio"] == 0.0
