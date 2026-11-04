# ===== CELL 0 =====
import os
from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")  # Non-blocking headless mode for local scripts
import matplotlib.pyplot as plt
import seaborn as sns

pd.set_option("display.max_columns", None)
pd.set_option("display.width", 150)
sns.set_style("whitegrid")

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = Path(os.getenv("DATASET_DIR", BASE_DIR / "datasets"))
MODEL_DIR = Path(os.getenv("MODEL_DIR", BASE_DIR / "models"))
MODEL_DIR.mkdir(parents=True, exist_ok=True)

if (DATASET_DIR / "all_experiences_merged.csv").exists():
    FILE_PATH = str(DATASET_DIR / "all_experiences_merged.csv")
else:
    FILE_PATH = str(DATASET_DIR / "all_experiences_cleaned.csv")


# ===== CELL 1 =====
# ============================================================
# STEP 1: Load the data
# ============================================================
df = pd.read_csv(FILE_PATH)
print("Shape (rows, cols):", df.shape)
df.head()

# ===== CELL 2 =====
# ============================================================
# STEP 2: First look — structure & dtypes
# ============================================================
print(df.info())
print("\nColumn list:\n", list(df.columns))

# ===== CELL 3 =====
# ============================================================
# STEP 3: Clean obviously-mistyped numeric columns
# Some numeric-looking fields (price_inr, duration_hours,
# advance_booking_days) load as strings because of stray
# characters/blank values. Coerce them properly.
# ============================================================
numeric_like_cols = ["price_inr", "duration_hours", "advance_booking_days"]
for col in numeric_like_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

print(df[numeric_like_cols].dtypes)

# ===== CELL 4 =====
# ============================================================
# STEP 4: Missing values
# ============================================================
missing = df.isnull().sum().sort_values(ascending=False)
missing_pct = (missing / len(df) * 100).round(2)
missing_summary = pd.DataFrame({"missing_count": missing, "missing_pct": missing_pct})
print(missing_summary[missing_summary["missing_count"] > 0])

plt.figure(figsize=(10, 6))
sns.heatmap(df.isnull(), cbar=False, cmap="viridis")
plt.title("Missing Value Heatmap")
plt.tight_layout()
plt.show()

# ===== CELL 5 =====
#============================================================
# STEP 5: Duplicate check
# ============================================================
print("Fully duplicated rows:", df.duplicated().sum())
print("Duplicate experience_id:", df["experience_id"].duplicated().sum())
print("Duplicate experience_name:", df["experience_name"].duplicated().sum())

# ============================================================
# STEP 6: Descriptive statistics — numeric columns
# ============================================================
numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
print("Numeric columns:", numeric_cols)
df[numeric_cols].describe().T

# ===== CELL 6 =====
# ============================================================
# STEP 7: Descriptive statistics — categorical columns
# ============================================================
cat_cols = df.select_dtypes(include="object").columns.tolist()
print("Categorical columns:", cat_cols)
for col in ["category", "sub_category", "region", "state", "indoor_outdoor",
            "booking_required", "local_experience", "hidden_gem"]:
    print(f"\n--- {col} ---")
    print(df[col].value_counts(dropna=False).head(15))

# ===== CELL 7 =====
# ============================================================
# STEP 8: Univariate — distribution of key numeric fields
# ============================================================
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
sns.histplot(df["price_inr"].dropna(), bins=30, kde=True, ax=axes[0, 0])
axes[0, 0].set_title("Price (INR) Distribution")

sns.histplot(df["duration_hours"].dropna(), bins=30, kde=True, ax=axes[0, 1])
axes[0, 1].set_title("Duration (hours) Distribution")

sns.histplot(df["rating"].dropna(), bins=20, kde=True, ax=axes[1, 0])
axes[1, 0].set_title("Rating Distribution")

sns.histplot(df["review_count"].dropna(), bins=30, kde=True, ax=axes[1, 1])
axes[1, 1].set_title("Review Count Distribution")
plt.tight_layout()
plt.show()

# ===== CELL 8 =====
#============================================================
# STEP 9: Categorical distributions — top categories/regions
# ============================================================
fig, axes = plt.subplots(1, 2, figsize=(16, 6))
df["category"].value_counts().head(15).plot(kind="barh", ax=axes[0])
axes[0].set_title("Top 15 Categories")
axes[0].invert_yaxis()

df["region"].value_counts().plot(kind="barh", ax=axes[1])
axes[1].set_title("Experiences by Region")
axes[1].invert_yaxis()
plt.tight_layout()
plt.show()

# ===== CELL 9 =====
# ============================================================
# STEP 10: Outlier detection (boxplots) — numeric fields
# ============================================================
fig, axes = plt.subplots(1, 3, figsize=(15, 5))
sns.boxplot(y=df["price_inr"], ax=axes[0])
axes[0].set_title("Price Outliers")

sns.boxplot(y=df["duration_hours"], ax=axes[1])
axes[1].set_title("Duration Outliers")

sns.boxplot(y=df["rating"], ax=axes[2])
axes[2].set_title("Rating Outliers")
plt.tight_layout()
plt.show()

# IQR-based outlier count for price
Q1, Q3 = df["price_inr"].quantile([0.25, 0.75])
IQR = Q3 - Q1
lower, upper = Q1 - 1.5 * IQR, Q3 + 1.5 * IQR
outliers = df[(df["price_inr"] < lower) | (df["price_inr"] > upper)]
print(f"Price outliers (IQR method): {len(outliers)} rows")

# ===== CELL 10 =====
# ============================================================
# STEP 11: Bivariate — relationships between numeric variables
# ============================================================
corr_cols = ["price_inr", "duration_hours", "rating", "review_count",
             "min_group_size", "max_group_size", "advance_booking_days"]
corr = df[corr_cols].corr()

plt.figure(figsize=(8, 6))
sns.heatmap(corr, annot=True, cmap="coolwarm", fmt=".2f")
plt.title("Correlation Matrix — Numeric Features")
plt.tight_layout()
plt.show()

# ===== CELL 11 =====
#============================================================
# STEP 12: Category vs numeric — e.g. price/rating by category
# ============================================================
plt.figure(figsize=(14, 6))
top_categories = df["category"].value_counts().head(10).index
sns.boxplot(data=df[df["category"].isin(top_categories)], x="category", y="price_inr")
plt.xticks(rotation=45, ha="right")
plt.title("Price Distribution by Category (Top 10)")
plt.tight_layout()
plt.show()

plt.figure(figsize=(10, 6))
sns.scatterplot(data=df, x="rating", y="review_count", hue="region", alpha=0.6)
plt.title("Rating vs Review Count, colored by Region")
plt.tight_layout()
plt.show()

# ===== CELL 12 =====
# ============================================================
# STEP 13: Geospatial sanity check (lat/long scatter)
# ============================================================
plt.figure(figsize=(8, 8))
sns.scatterplot(data=df, x="longitude", y="latitude", hue="region", alpha=0.6, s=20)
plt.title("Experience Locations (Lat/Long) by Region")
plt.tight_layout()
plt.show()

# ============================================================
# STEP 14: Text field — tags exploration (multi-value column)
# ============================================================
all_tags = df["tags"].dropna().str.split(";").explode().str.strip()
print("Top 20 tags:")
print(all_tags.value_counts().head(20))

plt.figure(figsize=(10, 6))
all_tags.value_counts().head(20).plot(kind="barh")
plt.title("Top 20 Tags")
plt.gca().invert_yaxis()
plt.tight_layout()
plt.show()

# ============================================================
# STEP 15: Summary flags — quick sanity counts
# ============================================================
print("local_experience counts:\n", df["local_experience"].value_counts(dropna=False))
print("\nhidden_gem counts:\n", df["hidden_gem"].value_counts(dropna=False))
print("\nbooking_required counts:\n", df["booking_required"].value_counts(dropna=False))

# ============================================================
# STEP 16: Save a cleaned copy for downstream analysis (optional)
# ============================================================
# df.to_csv("all_experiences_cleaned.csv", index=False)
print("\nEDA complete.")

# ===== CELL 13 =====
import pandas as pd
import numpy as np
import re


# ===== CELL 14 =====
if (DATASET_DIR / "all_experiences_merged.csv").exists():
    FILE_PATH = str(DATASET_DIR / "all_experiences_merged.csv")
else:
    FILE_PATH = str(DATASET_DIR / "all_experiences_cleaned.csv")
OUT_PATH = str(DATASET_DIR / "all_experiences_cleaned.csv")

df = pd.read_csv(FILE_PATH, encoding="utf-8-sig")  # utf-8-sig strips BOM automatically

# ===== CELL 15 =====
# ============================================================
# STEP 1: Clean column names (strip stray whitespace)
# ============================================================
df.columns = df.columns.str.strip()

# ============================================================
# STEP 2: Strip whitespace on every text/object column
# ============================================================
obj_cols = df.select_dtypes(include=["object", "string"]).columns
for col in obj_cols:
    df[col] = df[col].astype(str).str.strip().replace({"nan": np.nan, "": np.nan})

# ============================================================
# STEP 3: Clean price_inr -> numeric price_inr_clean
# Handles: "50", "0", "Free", "Free (donations optional)",
#          "Rs 25-50 entry", "Rs 300-800 for a meal", "Rs 10-20"
# Ranges become the midpoint; "Free" becomes 0.
# ============================================================
def clean_price(val):
    if pd.isna(val):
        return np.nan
    s = str(val).lower()
    if "free" in s:
        return 0.0
    nums = [float(n) for n in re.findall(r"\d+\.?\d*", s)]
    if not nums:
        return np.nan
    return sum(nums) / len(nums)  # midpoint if a range, else the single number

df["price_inr_clean"] = df["price_inr"].apply(clean_price)

# ============================================================
# STEP 4: Clean duration_hours -> numeric duration_hours_clean
# Handles: "2.5", "1-2", "0.25-0.5", "2-5 days typical", "4-24"
# "days" values are converted to hours (x24). Ranges -> midpoint.
# ============================================================
def clean_duration(val):
    if pd.isna(val):
        return np.nan
    s = str(val).lower()
    nums = [float(n) for n in re.findall(r"\d+\.?\d*", s)]
    if not nums:
        return np.nan
    midpoint = sum(nums) / len(nums)
    if "day" in s:
        midpoint *= 24
    return midpoint

df["duration_hours_clean"] = df["duration_hours"].apply(clean_duration)

# ============================================================
# STEP 5: Clean advance_booking_days -> numeric
# Handles: "0", "2-3 days", "0-1 day", "5-10 days (limited slots)", "3.0"
# ============================================================
def clean_days(val):
    if pd.isna(val):
        return np.nan
    nums = [float(n) for n in re.findall(r"\d+\.?\d*", str(val))]
    if not nums:
        return np.nan
    return sum(nums) / len(nums)

df["advance_booking_days_clean"] = df["advance_booking_days"].apply(clean_days)

# ============================================================
# STEP 6: Clean estimated_travel_time_from_city_center -> minutes
# Handles: "20 min", "10-15 min from Ratnagiri bus stand"
# ============================================================
def clean_travel_minutes(val):
    if pd.isna(val):
        return np.nan
    nums = [float(n) for n in re.findall(r"\d+\.?\d*", str(val))]
    if not nums:
        return np.nan
    return sum(nums) / len(nums)

df["travel_time_city_center_min"] = df["estimated_travel_time_from_city_center"].apply(clean_travel_minutes)

# ===== CELL 16 =====
# ============================================================
# STEP 7: Clean estimated_travel_time_from_panvel -> hours + km
# Handles: "~6.5-7 hrs by road via NH66 (approx 330 km)", "30 min", NaN
# Produces two numeric columns: hours and km (NaN where not stated).
# ============================================================
def clean_panvel_hours(val):
    if pd.isna(val):
        return np.nan
    s = str(val).lower()
    if "min" in s and "hr" not in s:
        nums = [float(n) for n in re.findall(r"\d+\.?\d*", s)]
        return (sum(nums) / len(nums)) / 60 if nums else np.nan
    hr_match = re.findall(r"([\d.]+)\s*-?\s*([\d.]*)\s*hrs?", s)
    nums = [float(n) for n in re.findall(r"\d+\.?\d*", s.split("(")[0])]
    return sum(nums) / len(nums) if nums else np.nan

def clean_panvel_km(val):
    if pd.isna(val):
        return np.nan
    s = str(val).lower()
    km_match = re.search(r"approx\s*([\d.]+)\s*km", s)
    return float(km_match.group(1)) if km_match else np.nan

df["travel_time_panvel_hrs"] = df["estimated_travel_time_from_panvel"].apply(clean_panvel_hours)
df["travel_dist_panvel_km"] = df["estimated_travel_time_from_panvel"].apply(clean_panvel_km)

# ============================================================
# STEP 8: Standardize Yes/No/True/False -> boolean columns
# local_experience and hidden_gem are clean binary fields.
# booking_required has extra nuance (Recommended, Sometimes,
# "Yes (boat)") so we keep that detail in *_detail and also
# produce a clean True/False column.
# ============================================================
def to_bool(val):
    if pd.isna(val):
        return np.nan
    s = str(val).strip().lower()
    if s in ("yes", "true"):
        return True
    if s in ("no", "false"):
        return False
    return np.nan  # ambiguous values handled separately below

df["local_experience_bool"] = df["local_experience"].apply(to_bool)
df["hidden_gem_bool"] = df["hidden_gem"].apply(to_bool)

df["booking_required_detail"] = df["booking_required"]  # keep original nuance
df["booking_required_bool"] = df["booking_required"].apply(
    lambda s: True if pd.notna(s) and str(s).strip().lower().startswith(("yes", "true", "recommended", "sometimes"))
    else (False if pd.notna(s) and str(s).strip().lower() in ("no", "false") else np.nan)
)

# ===== CELL 17 =====
# ============================================================
# STEP 9: Standardize indoor_outdoor into 3 clean categories
# ============================================================
def clean_indoor_outdoor(val):
    if pd.isna(val):
        return np.nan
    s = str(val).strip().lower()
    if s == "indoor":
        return "Indoor"
    if s == "outdoor":
        return "Outdoor"
    return "Mixed"  # covers Both/Mixed/Indoor-Outdoor/Outdoor-Indoor variants

df["indoor_outdoor_clean"] = df["indoor_outdoor"].apply(clean_indoor_outdoor)

# ============================================================
# STEP 10: Duplicates
# ============================================================
before = len(df)
df = df.drop_duplicates()
print(f"Dropped {before - len(df)} fully duplicated rows")

dup_ids = df["experience_id"].duplicated().sum()
if dup_ids:
    print(f"Warning: {dup_ids} duplicate experience_id values remain — inspect manually")

# ============================================================
# STEP 11: Missing value handling
# - Numeric core fields: leave as NaN (don't fabricate), but flag them
# - max_group_size missing -> assumed same as min_group_size is risky,
#   so just flag rather than impute
# ============================================================
df["rating_missing"] = df["rating"].isna()
df["review_count_missing"] = df["review_count"].isna()
df["max_group_size_missing"] = df["max_group_size"].isna()

print("\nRemaining missing values per column (top 15):")
print(df.isnull().sum().sort_values(ascending=False).head(15))

# ============================================================
# STEP 12: Final sanity checks
# ============================================================
print("\nFinal shape:", df.shape)
print("\nCleaned numeric columns preview:")
print(df[[
    "price_inr", "price_inr_clean",
    "duration_hours", "duration_hours_clean",
    "advance_booking_days", "advance_booking_days_clean",
    "estimated_travel_time_from_city_center", "travel_time_city_center_min",
    "estimated_travel_time_from_panvel", "travel_time_panvel_hrs", "travel_dist_panvel_km",
    "indoor_outdoor", "indoor_outdoor_clean",
    "booking_required", "booking_required_bool",
    "local_experience", "local_experience_bool",
    "hidden_gem", "hidden_gem_bool",
]].head(10))

# ============================================================
# STEP 13: Save cleaned file
# ============================================================
df.to_csv(OUT_PATH, index=False)
print(f"\nSaved cleaned file to {OUT_PATH}")

# ===== CELL 18 =====
#  Imports
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score
)

pd.set_option('display.max_columns', 100)
print("Libraries loaded.")

# ===== CELL 19 =====
# Load dataset files from local directory
INTERACTIONS_PATH = str(DATASET_DIR / "synthetic_traveler_interactions.csv")
EXPERIENCES_PATH = str(DATASET_DIR / "all_experiences_cleaned.csv")

# ===== CELL 20 =====
# Load CSVs
df_interactions = pd.read_csv(INTERACTIONS_PATH)
df_experiences = pd.read_csv(EXPERIENCES_PATH)

print("Interactions:", df_interactions.shape)
print("Experiences:", df_experiences.shape)

# ===== CELL 21 =====
# Inspection
for name, df in [('INTERACTIONS', df_interactions), ('EXPERIENCES', df_experiences)]:
    print(f"\n{'='*20} {name} {'='*20}")
    print("Shape:", df.shape)
    print("\nColumns & dtypes:\n", df.dtypes)
    print("\nMissing values (only >0):\n", df.isnull().sum()[df.isnull().sum() > 0])
    print("\nDuplicate rows:", df.duplicated().sum())
    print("\nSample records:\n", df.head(3))

print("\nTarget distribution (match_label):")
print(df_interactions['match_label'].value_counts(normalize=True))

# ===== CELL 22 =====
# Validate experience_id relationship
ids_in_interactions = set(df_interactions['experience_id'].unique())
ids_in_db = set(df_experiences['experience_id'].unique())

print("Unique experience_id in interactions:", len(ids_in_interactions))
print("Unique experience_id in experience DB:", len(ids_in_db))
print("In interactions but missing from DB:", len(ids_in_interactions - ids_in_db))
print("In DB but never used in interactions:", len(ids_in_db - ids_in_interactions))

assert df_experiences['experience_id'].duplicated().sum() == 0, "Duplicate experience_id in DB!"
print("\nexperience_id is a clean, matching join key between both files.")

# ===== CELL 23 =====
# Feature engineering
# We do NOT use traveler_id, experience_id, or match_label as features.
# We also exclude match_score_bootstrap, interest_match, budget_match, time_match,
# group_match, distance_match — these were found to be near-deterministic generators
# of match_label itself (data leakage), so training on them would let the model
# just memorize the labeling rule instead of learning real patterns.
# We also ignore the interaction file's own experience_price_inr/duration/rating
# columns, since ~80-220 experiences had mismatched values vs. the experience DB;
# we join the authoritative values from all_experiences_cleaned.csv instead.

exp_cols = ['experience_id', 'experience_name', 'city', 'category', 'sub_category',
            'tags', 'best_for', 'price_inr_clean', 'duration_hours_clean', 'rating',
            'rating_missing', 'min_group_size', 'max_group_size',
            'indoor_outdoor_clean', 'local_experience_bool', 'hidden_gem_bool']
df_exp_sub = df_experiences[exp_cols].copy()

df = df_interactions.merge(df_exp_sub, on='experience_id', how='left')
assert df['experience_name'].isna().sum() == 0, "Some experience_ids failed to join!"

def _tokenize(s, sep):
    if pd.isna(s):
        return set()
    return set(t.strip().lower() for t in str(s).split(sep) if t.strip())

def compute_interest_overlap(interests, tags, category, best_for):
    traveler_tokens = _tokenize(interests, '|')
    exp_tokens = _tokenize(tags, ';') | _tokenize(category, ';') | _tokenize(best_for, ';')
    overlap = traveler_tokens & exp_tokens
    overlap_count = len(overlap)
    overlap_ratio = overlap_count / len(traveler_tokens) if traveler_tokens else 0.0
    return overlap_count, overlap_ratio

overlap_results = df.apply(
    lambda r: compute_interest_overlap(r['interests'], r['tags'], r['category'], r['best_for']),
    axis=1
)
df['interest_overlap_count'] = overlap_results.apply(lambda t: t[0])
df['interest_overlap_ratio'] = overlap_results.apply(lambda t: t[1])

df['price_diff'] = df['budget_inr'] - df['price_inr_clean']
df['affordable'] = (df['price_inr_clean'] <= df['budget_inr']).astype(int)
df['time_diff'] = df['available_time_hours'] - df['duration_hours_clean']
df['fits_time'] = (df['duration_hours_clean'] <= df['available_time_hours']).astype(int)

max_group_filled = df['max_group_size'].fillna(999)
df['group_size_ok'] = (
    (df['traveler_count'] >= df['min_group_size']) &
    (df['traveler_count'] <= max_group_filled)
).astype(int)

df['local_experience_bool'] = df['local_experience_bool'].astype(int)
df['hidden_gem_bool'] = df['hidden_gem_bool'].astype(int)
df['rating_missing'] = df['rating_missing'].astype(int)

numeric_features = ['budget_inr', 'available_time_hours', 'traveler_count',
                     'price_inr_clean', 'duration_hours_clean', 'rating',
                     'price_diff', 'time_diff', 'interest_overlap_count', 'interest_overlap_ratio']
binary_features = ['affordable', 'fits_time', 'group_size_ok',
                    'local_experience_bool', 'hidden_gem_bool', 'rating_missing']
categorical_features = ['group_type', 'category', 'sub_category', 'indoor_outdoor_clean']

feature_cols = numeric_features + binary_features + categorical_features
X = df[feature_cols].copy()
y = df['match_label'].copy()
groups = df['traveler_id'].copy()   # needed for the group-aware split in CELL 7

numeric_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])
binary_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='most_frequent'))
])
categorical_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('onehot', OneHotEncoder(handle_unknown='ignore'))
])

preprocessor = ColumnTransformer(transformers=[
    ('num', numeric_transformer, numeric_features),
    ('bin', binary_transformer, binary_features),
    ('cat', categorical_transformer, categorical_features)
])

print("Feature matrix shape:", X.shape)
print("Missing values per feature (>0 only):\n", X.isna().sum()[X.isna().sum() > 0])

# ===== CELL 24 =====
# Group-aware train/test split
# The dataset is a full cross-join of only 20 travelers x 757 experiences, so every
# traveler appears in ~757 rows. A random row-level split would put the SAME
# traveler's rows in both train and test, letting the model "recognize" that
# traveler rather than generalize -> optimistic, leaky evaluation.
# GroupShuffleSplit instead splits by traveler_id, so entire travelers (and all
# their rows) go either fully into train or fully into test.

gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
train_idx, test_idx = next(gss.split(X, y, groups=groups))

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

print(f"Train travelers: {groups.iloc[train_idx].nunique()} | Test travelers: {groups.iloc[test_idx].nunique()}")
print(f"Train records: {len(X_train)} | Test records: {len(X_test)}")

# ===== CELL 25 =====
# Train model
model_pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('classifier', RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        class_weight='balanced'   # match_label is ~76% / 24% imbalanced
    ))
])

model_pipeline.fit(X_train, y_train)
print("Model trained.")

# ===== CELL 26 =====
# Evaluation
y_pred = model_pipeline.predict(X_test)
y_proba = model_pipeline.predict_proba(X_test)[:, 1]

acc = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred)
rec = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_proba)
cm = confusion_matrix(y_test, y_pred)

print(f"Accuracy:  {acc:.4f}")
print(f"Precision: {prec:.4f}")
print(f"Recall:    {rec:.4f}")
print(f"F1-score:  {f1:.4f}")
print(f"ROC-AUC:   {roc_auc:.4f}")
print("Confusion matrix:\n", cm)

# ===== CELL 27 =====
# Feature importance
fitted_preprocessor = model_pipeline.named_steps['preprocessor']
fitted_model = model_pipeline.named_steps['classifier']

cat_feature_names = fitted_preprocessor.named_transformers_['cat'].named_steps['onehot'] \
    .get_feature_names_out(categorical_features)
all_feature_names = numeric_features + binary_features + list(cat_feature_names)

importances = pd.Series(fitted_model.feature_importances_, index=all_feature_names) \
    .sort_values(ascending=False)

print("Top 15 features:")
print(importances.head(15))

# ===== CELL 28 =====
# Save artifacts
PIPELINE_PATH = str(MODEL_DIR / "preprocessing_pipeline.pkl")
MODEL_PATH = str(MODEL_DIR / "recommendation_model.pkl")

joblib.dump(fitted_preprocessor, PIPELINE_PATH)
joblib.dump(fitted_model, MODEL_PATH)
print(f"Saved: {PIPELINE_PATH}, {MODEL_PATH}")

# ===== CELL 29 =====
# Load back and verify
loaded_preprocessor = joblib.load(PIPELINE_PATH)
loaded_model = joblib.load(MODEL_PATH)

X_test_transformed = loaded_preprocessor.transform(X_test)
proba_check = loaded_model.predict_proba(X_test_transformed)[:, 1]

print("Loaded artifacts match original predictions:", np.allclose(proba_check, y_proba))

# ===== CELL 30 =====
# Recommendation function with location filter
def recommend_experiences(budget_inr, available_time_hours, traveler_count,
                           group_type, interests, location=None, top_n=10):
    candidates = df_experiences[df_experiences['duration_hours_clean'].notna()].copy()

    # Optional location filter — matches against city, district, or region
    # (case-insensitive substring match, so "konkan" or "alibag" both work)
    if location:
        loc = location.strip().lower()
        loc_mask = (
            candidates['city'].str.lower().str.contains(loc, na=False) |
            candidates['district'].str.lower().str.contains(loc, na=False) |
            candidates['region'].str.lower().str.contains(loc, na=False)
        )
        candidates = candidates[loc_mask]
        if candidates.empty:
            print(f"No experiences found for location '{location}'. Showing all locations instead.")
            candidates = df_experiences[df_experiences['duration_hours_clean'].notna()].copy()

    rows = []
    for _, exp in candidates.iterrows():
        oc, orat = compute_interest_overlap(interests, exp['tags'], exp['category'], exp['best_for'])
        price = exp['price_inr_clean']
        duration = exp['duration_hours_clean']
        min_g = exp['min_group_size']
        max_g = exp['max_group_size'] if not pd.isna(exp['max_group_size']) else 999

        rows.append({
            'experience_id': exp['experience_id'],
            'budget_inr': budget_inr,
            'available_time_hours': available_time_hours,
            'traveler_count': traveler_count,
            'price_inr_clean': price,
            'duration_hours_clean': duration,
            'rating': exp['rating'],
            'price_diff': budget_inr - price if pd.notna(price) else np.nan,
            'time_diff': available_time_hours - duration if pd.notna(duration) else np.nan,
            'interest_overlap_count': oc,
            'interest_overlap_ratio': orat,
            'affordable': int(price <= budget_inr) if pd.notna(price) else 0,
            'fits_time': int(duration <= available_time_hours) if pd.notna(duration) else 0,
            'group_size_ok': int(min_g <= traveler_count <= max_g),
            'local_experience_bool': int(exp['local_experience_bool']),
            'hidden_gem_bool': int(exp['hidden_gem_bool']),
            'rating_missing': int(exp['rating_missing']),
            'group_type': group_type,
            'category': exp['category'],
            'sub_category': exp['sub_category'],
            'indoor_outdoor_clean': exp['indoor_outdoor_clean'],
        })

    feat_df = pd.DataFrame(rows)

    mask = (feat_df['affordable'] == 1) & (feat_df['fits_time'] == 1)
    filtered = feat_df[mask].copy()
    if filtered.empty:
        filtered = feat_df.copy()

    Xc = filtered[feature_cols]
    Xt = loaded_preprocessor.transform(Xc)
    filtered['recommendation_score'] = loaded_model.predict_proba(Xt)[:, 1]

    result = filtered.merge(
        df_experiences[['experience_id', 'experience_name', 'city']],
        on='experience_id', how='left'
    )
    result = result.sort_values('recommendation_score', ascending=False).head(top_n)

    return result[['experience_id', 'experience_name', 'category', 'city',
                    'price_inr_clean', 'duration_hours_clean', 'rating', 'recommendation_score']]

print("recommend_experiences() ready (now supports location filtering).")

# ===== CELL 31 =====
recs = recommend_experiences(
    budget_inr=4000,
    available_time_hours=2,
    traveler_count=5,
    group_type='Friends',
    interests='adventure|nature',   # swap in your actual interests
    location='Panvel',
    top_n=20
)
recs.reset_index(drop=True)

# ===== CELL 32 =====
# Additional test profiles
profiles = [
    dict(budget_inr=500,  available_time_hours=2, traveler_count=1, group_type='Solo',
         interests='heritage|photography'),
    dict(budget_inr=3000, available_time_hours=8, traveler_count=6, group_type='Family',
         interests='wildlife|nature|food'),
    dict(budget_inr=800,  available_time_hours=3, traveler_count=2, group_type='Couple',
         interests='beach|sunset|nightlife'),
    dict(budget_inr=2000, available_time_hours=6, traveler_count=4, group_type='Friends',
         interests='adventure|sports|trekking'),
]

for i, p in enumerate(profiles, start=1):
    print(f"\n{'='*10} Profile {i}: {p} {'='*10}")
    recs = recommend_experiences(**p, top_n=5).reset_index(drop=True)
    recs.index = recs.index + 1
    print(recs[['experience_name', 'category', 'city', 'price_inr_clean',
                'duration_hours_clean', 'rating', 'recommendation_score']])

# ---- Final summary ----
print("\n" + "="*50)
print("SUMMARY")
print("="*50)
print(f"Number of experiences:      {df_experiences.shape[0]}")
print(f"Number of interaction rows: {df_interactions.shape[0]}")
print(f"Number of input features:   {len(feature_cols)} (before one-hot expansion)")
print(f"Training records:           {len(X_train)}")
print(f"Test records:               {len(X_test)}")
print(f"Model accuracy:             {acc:.4f}")
print(f"F1-score:                   {f1:.4f}")
print(f"ROC-AUC:                    {roc_auc:.4f}")
print("Saved model files:          recommendation_model.pkl, preprocessing_pipeline.pkl (Colab working directory)")
print()
print("NOTE: match_label is a synthetic, rule-based bootstrap label used for this")
print("hackathon prototype. These metrics measure how well the model reproduces")
print("that synthetic rule, NOT real-world traveler satisfaction or preference accuracy.")

# ===== CELL 33 =====
# CELL 16: Haversine distance + location-by-coordinates filter
def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    return 2 * R * np.arcsin(np.sqrt(a))

def get_scored_candidates(budget_inr, available_time_hours, traveler_count,
                           group_type, interests,
                           user_lat=None, user_lon=None, radius_km=25):
    """Filters by distance (if lat/lon given), scores every candidate with the model,
    but does NOT enforce time/budget as a group yet — that's the optimizer's job."""
    candidates = df_experiences[df_experiences['duration_hours_clean'].notna()].copy()

    if user_lat is not None and user_lon is not None:
        candidates = candidates[candidates['latitude'].notna() & candidates['longitude'].notna()].copy()
        candidates['distance_km'] = haversine_km(user_lat, user_lon,
                                                  candidates['latitude'], candidates['longitude'])
        candidates = candidates[candidates['distance_km'] <= radius_km]
        if candidates.empty:
            print(f"No experiences within {radius_km} km. Try a larger radius.")
            return pd.DataFrame()
    else:
        candidates['distance_km'] = np.nan

    rows = []
    for _, exp in candidates.iterrows():
        oc, orat = compute_interest_overlap(interests, exp['tags'], exp['category'], exp['best_for'])
        price = exp['price_inr_clean']
        duration = exp['duration_hours_clean']
        min_g = exp['min_group_size']
        max_g = exp['max_group_size'] if not pd.isna(exp['max_group_size']) else 999

        rows.append({
            'experience_id': exp['experience_id'],
            'experience_name': exp['experience_name'],
            'city': exp['city'],
            'latitude': exp['latitude'], 'longitude': exp['longitude'],
            'distance_km': exp['distance_km'],
            'budget_inr': budget_inr, 'available_time_hours': available_time_hours,
            'traveler_count': traveler_count,
            'price_inr_clean': price, 'duration_hours_clean': duration, 'rating': exp['rating'],
            'price_diff': budget_inr - price if pd.notna(price) else np.nan,
            'time_diff': available_time_hours - duration if pd.notna(duration) else np.nan,
            'interest_overlap_count': oc, 'interest_overlap_ratio': orat,
            'affordable': int(price <= budget_inr) if pd.notna(price) else 0,
            'fits_time': int(duration <= available_time_hours) if pd.notna(duration) else 0,
            'group_size_ok': int(min_g <= traveler_count <= max_g),
            'local_experience_bool': int(exp['local_experience_bool']),
            'hidden_gem_bool': int(exp['hidden_gem_bool']),
            'rating_missing': int(exp['rating_missing']),
            'group_type': group_type, 'category': exp['category'],
            'sub_category': exp['sub_category'], 'indoor_outdoor_clean': exp['indoor_outdoor_clean'],
        })

    feat_df = pd.DataFrame(rows)
    Xt = loaded_preprocessor.transform(feat_df[feature_cols])
    feat_df['recommendation_score'] = loaded_model.predict_proba(Xt)[:, 1]
    return feat_df

print("get_scored_candidates() ready.")

# ===== CELL 34 =====
# CELL 17: Knapsack-style itinerary builder
# Picks a COMBINATION of experiences whose total duration <= available_time_hours
# AND total price <= budget_inr, maximizing total recommendation_score.
# Uses two greedy heuristics and keeps the better one (fast, no extra dependencies
# — good enough for a hackathon; swap for PuLP/OR-Tools later if you want optimal).

def build_itinerary(scored_df, available_time_hours, budget_inr, max_stops=5):
    if scored_df.empty:
        return pd.DataFrame()

    df_ = scored_df.copy()
    df_ = df_[(df_['duration_hours_clean'] <= available_time_hours) &
              (df_['price_inr_clean'] <= budget_inr)]
    if df_.empty:
        return pd.DataFrame()

    def greedy(sort_col, ascending=False):
        remaining_time = available_time_hours
        remaining_budget = budget_inr
        picked = []
        for _, row in df_.sort_values(sort_col, ascending=ascending).iterrows():
            if len(picked) >= max_stops:
                break
            if row['duration_hours_clean'] <= remaining_time and row['price_inr_clean'] <= remaining_budget:
                if any(p['experience_id'] == row['experience_id'] for p in picked):
                    continue
                picked.append(row)
                remaining_time -= row['duration_hours_clean']
                remaining_budget -= row['price_inr_clean']
        return picked

    # Heuristic A: highest score first
    option_a = greedy('recommendation_score', ascending=False)
    # Heuristic B: best score-per-hour (favors fitting more short, high-value stops)
    df_['score_per_hour'] = df_['recommendation_score'] / df_['duration_hours_clean'].replace(0, 0.25)
    option_b = greedy('score_per_hour', ascending=False)

    best = option_a if sum(r['recommendation_score'] for r in option_a) >= \
                        sum(r['recommendation_score'] for r in option_b) else option_b

    if not best:
        return pd.DataFrame()

    itinerary = pd.DataFrame(best)

    # Order stops by nearest-neighbor from current location (if distance available)
    if itinerary['distance_km'].notna().all():
        itinerary = itinerary.sort_values('distance_km').reset_index(drop=True)

    itinerary['total_time_used'] = itinerary['duration_hours_clean'].cumsum()
    itinerary['total_budget_used'] = itinerary['price_inr_clean'].cumsum()
    return itinerary[['experience_id', 'experience_name', 'city', 'category',
                       'price_inr_clean', 'duration_hours_clean', 'rating',
                       'distance_km', 'recommendation_score',
                       'total_time_used', 'total_budget_used']]

print("build_itinerary() ready.")

# ===== CELL 35 =====
# CELL 18: Test — 2 hrs, ₹4000, 5 people (you + 4 friends), somewhere nearby
scored = get_scored_candidates(
    budget_inr=4000, available_time_hours=5, traveler_count=3,
    group_type='Friends', interests='food',
    user_lat=18.9904, user_lon=73.1281,   # example: swap in real coords
    radius_km=20
)

itinerary = build_itinerary(scored, available_time_hours=5, budget_inr=4000, max_stops=10)
print(itinerary.to_string(index=False))

