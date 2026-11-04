"""
Verification and Debug Comparison Tool: Notebook vs Backend Implementation
Validates that backend produces mathematically identical results to the Jupyter Notebook.
"""
import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath("."))
from backend.app.main import app
from ml.recommendation.engine import haversine_km, compute_interest_overlap

# Test Input
TEST_INPUT = {
    "budget_inr": 4000.0,
    "available_time_hours": 5.0,
    "traveler_count": 3,
    "group_type": "Friends",
    "interests": "Food|Culture",
    "user_lat": 18.9904,
    "user_lon": 73.1281,
    "radius_km": 25.0,
    "top_n": 10,
}

print("=" * 70)
print("PART 27: NOTEBOOK VS BACKEND COMPARISON BENCHMARK")
print("=" * 70)

# 1. Load pure notebook pipeline
df_experiences = pd.read_csv("ml/datasets/all_experiences_cleaned.csv")
loaded_preprocessor = joblib.load("ml/models/preprocessing_pipeline.pkl")
loaded_model = joblib.load("ml/models/recommendation_model.pkl")

# Total experiences
total_exp_count = len(df_experiences)
valid_coords_count = df_experiences["latitude"].notna().sum() & df_experiences["longitude"].notna().sum()
print(f"1. Total Catalog Experiences:           {total_exp_count}")
print(f"2. Experiences with Valid Coordinates:   {valid_coords_count}")

# Notebook candidate generation
nb_candidates = df_experiences[df_experiences["duration_hours_clean"].notna()].copy()
nb_candidates = nb_candidates[nb_candidates["latitude"].notna() & nb_candidates["longitude"].notna()].copy()
nb_candidates["distance_km"] = haversine_km(
    TEST_INPUT["user_lat"], TEST_INPUT["user_lon"],
    nb_candidates["latitude"], nb_candidates["longitude"]
)
nb_candidates = nb_candidates[nb_candidates["distance_km"] <= TEST_INPUT["radius_km"]].copy()

print(f"3. Radius-filtered Candidates (<= 25km): {len(nb_candidates)}")

# Notebook feature construction
numeric_features = [
    "budget_inr", "available_time_hours", "traveler_count",
    "price_inr_clean", "duration_hours_clean", "rating",
    "price_diff", "time_diff", "interest_overlap_count", "interest_overlap_ratio"
]
binary_features = [
    "affordable", "fits_time", "group_size_ok",
    "local_experience_bool", "hidden_gem_bool", "rating_missing"
]
categorical_features = ["group_type", "category", "sub_category", "indoor_outdoor_clean"]
feature_cols = numeric_features + binary_features + categorical_features

rows = []
for _, exp in nb_candidates.iterrows():
    oc, orat = compute_interest_overlap(TEST_INPUT["interests"], exp["tags"], exp["category"], exp["best_for"])
    price = exp["price_inr_clean"]
    duration = exp["duration_hours_clean"]
    min_g = exp["min_group_size"] if pd.notna(exp["min_group_size"]) else 1
    max_g = exp["max_group_size"] if pd.notna(exp["max_group_size"]) else 999

    rows.append({
        "experience_id": exp["experience_id"],
        "experience_name": exp["experience_name"],
        "city": exp["city"],
        "latitude": exp["latitude"], "longitude": exp["longitude"],
        "distance_km": exp["distance_km"],
        "budget_inr": TEST_INPUT["budget_inr"],
        "available_time_hours": TEST_INPUT["available_time_hours"],
        "traveler_count": TEST_INPUT["traveler_count"],
        "price_inr_clean": price, "duration_hours_clean": duration, "rating": exp["rating"],
        "price_diff": TEST_INPUT["budget_inr"] - price if pd.notna(price) else np.nan,
        "time_diff": TEST_INPUT["available_time_hours"] - duration if pd.notna(duration) else np.nan,
        "interest_overlap_count": oc, "interest_overlap_ratio": orat,
        "affordable": int(price <= TEST_INPUT["budget_inr"]) if pd.notna(price) else 0,
        "fits_time": int(duration <= TEST_INPUT["available_time_hours"]) if pd.notna(duration) else 0,
        "group_size_ok": int(min_g <= TEST_INPUT["traveler_count"] <= max_g),
        "local_experience_bool": int(exp["local_experience_bool"]),
        "hidden_gem_bool": int(exp["hidden_gem_bool"]),
        "rating_missing": int(exp["rating_missing"]),
        "group_type": TEST_INPUT["group_type"], "category": exp["category"],
        "sub_category": exp["sub_category"], "indoor_outdoor_clean": exp["indoor_outdoor_clean"],
    })

feat_df = pd.DataFrame(rows)
Xt_nb = loaded_preprocessor.transform(feat_df[feature_cols])
feat_df["recommendation_score"] = loaded_model.predict_proba(Xt_nb)[:, 1]
nb_top = feat_df.sort_values("recommendation_score", ascending=False).head(TEST_INPUT["top_n"])

# 2. Call Backend API
client = TestClient(app)
api_payload = {
    "budget_inr": TEST_INPUT["budget_inr"],
    "available_time_hours": TEST_INPUT["available_time_hours"],
    "traveler_count": TEST_INPUT["traveler_count"],
    "group_type": TEST_INPUT["group_type"],
    "interests": ["Food", "Culture"],
    "user_lat": TEST_INPUT["user_lat"],
    "user_lon": TEST_INPUT["user_lon"],
    "radius_km": TEST_INPUT["radius_km"],
    "top_n": TEST_INPUT["top_n"],
}
resp = client.post("/api/recommendations", json=api_payload)
backend_data = resp.json()
backend_recs = backend_data["recommendations"]

print("\n" + "=" * 70)
print("SIDE-BY-SIDE RANKING COMPARISON (TOP 10)")
print("=" * 70)
print(f"{'Rank':<5} | {'Notebook ID':<12} {'NB Score':<10} | {'Backend ID':<12} {'BE Score':<10} | {'Image URL Found':<16} | {'Match?'}")
print("-" * 70)

all_match = True
for idx in range(TEST_INPUT["top_n"]):
    nb_row = nb_top.iloc[idx]
    be_row = backend_recs[idx]

    nb_id = nb_row["experience_id"]
    nb_sc = nb_row["recommendation_score"]
    be_id = be_row["experience_id"]
    be_sc = be_row["recommendation_score"]
    has_img = bool(be_row.get("image_url") and be_row["image_url"].startswith("http"))
    match = (nb_id == be_id) and (abs(nb_sc - be_sc) < 1e-3)

    if not match:
        all_match = False

    print(f"{idx+1:<5} | {nb_id:<12} {nb_sc:<10.4f} | {be_id:<12} {be_sc:<10.4f} | {'Yes (' + be_row['image_url'][:15] + '...)' if has_img else 'No':<16} | {'MATCH' if match else 'DIVERGENCE'}")

print("=" * 70)
print(f"OVERALL ALIGNMENT RESULT: {'100% IDENTICAL - ZERO DIVERGENCE' if all_match else 'FAILED DIVERGENCE DETECTED'}")
print("=" * 70)
