# LocalLens Machine Learning Serving Layer

This workspace provides the ML scoring, feature engineering, itinerary optimization, provider listing validation, and real-time inference API for **Local & Experiences**.

> **Note on Model Predictions**:
> The recommendation model was trained on a synthetic bootstrap interaction dataset. Output probabilities are used as a **relative ranking signal** for preference scoring, not as calibrated real-world probabilities.

---

## Directory Structure

```text
ml/
├── models/              # Serialized artifacts: preprocessing_pipeline.pkl & recommendation_model.pkl
├── datasets/            # Experience database: all_experiences_cleaned.csv
├── notebooks/           # Exploratory & model training notebooks (do not modify)
├── preprocessing/       # Feature extraction, interest tokenization, haversine distances
├── recommendation/      # RecommendationEngine: Candidate scoring, hard filters & ranking
├── itinerary/           # ItineraryOptimizer: Multi-strategy knapsack + TSP route ordering
├── experience_quality/  # ExperienceValidator: Provider listing validation & registration
├── inference/           # Real-time serving layer (FastAPI app + singleton MLServingService)
├── tests/               # Comprehensive pytest test suite
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
└── README.md            # Documentation
```

---

## Architecture & Data Flow

```text
               +-----------------------------+
               |  Traveler Request / Client  |
               +--------------+--------------+
                              |
                              v
                [ ml/inference/ (FastAPI) ]
                              |
                              v
               [ ml/recommendation/engine.py ]
                              |
            +-----------------+-----------------+
            |                                   |
            v                                   v
[ ml/datasets/ (CSV Pool) ]         [ ml/preprocessing/features.py ]
                                    (Overlap, diffs, flags, distances)
                                                |
                                                v
                                    [ ml/models/ (Pipeline + RF) ]
                                    (predict_proba scoring)
                                                |
                                                v
                                    Hard Filters & Score Ranking
                                                |
                                                v
                                   [ ml/itinerary/optimizer.py ]
                                   (Knapsack heuristics + TSP route)
                                                |
                                                v
                                    Optimized Itinerary / Ranked List
```

### 1. `ml/preprocessing/` (Feature Engineering)
- **Tokenization & Overlap**: Splits traveler interests on `|` and experience tags/category/best_for on `;`, producing `interest_overlap_count` and `interest_overlap_ratio`.
- **Geospatial Distance**: Vectorized Haversine distance in kilometers.
- **Feature Matrix Alignment**: Transforms traveler inputs and candidate experience rows into the exact `FEATURE_COLS` schema (`NUMERIC_FEATURES` + `BINARY_FEATURES` + `CATEGORICAL_FEATURES`) required by `preprocessing_pipeline.pkl`.

### 2. `ml/recommendation/` (Scoring & Ranking)
- Loads `preprocessing_pipeline.pkl` and `recommendation_model.pkl` once at startup.
- Evaluates all candidate experiences in the database via `model.predict_proba(X)[:, 1]`.
- Applies hard feasibility constraints: `affordable == 1` and `fits_time == 1` (and optional radius filtering if coordinates are provided).
- Returns top-N ranked items with metadata, scores, and distances.

### 3. `ml/itinerary/` (Itinerary Optimization)
- Solves a multi-dimensional 2D knapsack problem (time cap + monetary budget cap).
- Evaluates multiple optimization heuristics:
  - *Score descending*
  - *Score density per hour* (`score / duration`)
  - *Score density per price* (`score / price`)
  - *Composite density*
  - *Exact Branch & Bound* on top candidate pool
- Orders the chosen combination geographically using a Nearest-Neighbor TSP route heuristic starting from the user's location.

### 4. `ml/experience_quality/` (Provider Onboarding)
- Validates provider submissions for listing sanity: non-empty names/categories, price $\ge 0$, duration $> 0$, valid coordinates ($-90 \le \text{lat} \le 90$, $-180 \le \text{lon} \le 180$).
- Sanitizes derived fields, generates unique city-prefixed IDs (e.g. `DEL-758`), appends to in-memory pool, and persists to `all_experiences_cleaned.csv`.
- **No retraining needed**: The model scores dynamic features rather than static IDs, and `OneHotEncoder(handle_unknown="ignore")` handles unseen categories cleanly.

### 5. `ml/inference/` (Serving Layer)
- Exposes high-performance FastAPI microservice endpoints:
  - `GET /health`: Model status and loaded experience counts.
  - `POST /recommend`: Ranked discovery recommendations.
  - `POST /itinerary`: Budget- and time-constrained multi-stop itinerary.
  - `POST /experiences`: Provider listing validation and registration.
  - `GET /experiences`: List current experience pool.
- Exposes `MLServingService` for direct Python import by backend services.

---

## Getting Started

### 1. Setup Environment
```bash
cd ml
python -m venv venv
```

**Activate (Windows):**
```powershell
venv\Scripts\activate
```

**Activate (Linux/macOS):**
```bash
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

### 4. Run Tests
```bash
pytest tests/ -v
```

### 5. Run Inference Server
```bash
uvicorn ml.inference.app:app --host 0.0.0.0 --port 8001 --reload
```
Interactive Swagger docs: `http://localhost:8001/docs`
