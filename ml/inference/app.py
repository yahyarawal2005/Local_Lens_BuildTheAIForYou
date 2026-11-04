"""
FastAPI application for the ML Serving Layer.
Exposes real-time endpoints for recommendations, itinerary planning, and provider listing onboarding.
"""
from contextlib import asynccontextmanager
from typing import Optional
import logging
import os
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from ml.experience_quality.validator import ValidationError
from ml.inference.schemas import (
    ExperienceSubmissionRequest,
    ExperienceSubmissionResponse,
    HealthResponse,
    ItineraryRequest,
    ItineraryResponse,
    RecommendationRequest,
    RecommendationResponse,
)
from ml.inference.service import MLServingService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml_serving")

# Service singleton placeholder
serving_service: Optional[MLServingService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: load ML models and dataset once at startup."""
    global serving_service
    logger.info("Starting up ML Serving Service...")
    model_dir = os.getenv("MODEL_DIR")
    dataset_dir = os.getenv("DATASET_DIR")
    serving_service = MLServingService.get_instance(model_dir=model_dir, dataset_dir=dataset_dir)
    logger.info("ML Serving Service is ready to serve requests.")
    yield
    logger.info("Shutting down ML Serving Service.")


app = FastAPI(
    title="LocalLens ML Serving API",
    description="Intelligent discovery, recommendation scoring, and itinerary optimization service.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_service() -> MLServingService:
    """Dependency helper to retrieve the MLServingService instance."""
    global serving_service
    if serving_service is None:
        model_dir = os.getenv("MODEL_DIR")
        dataset_dir = os.getenv("DATASET_DIR")
        serving_service = MLServingService.get_instance(model_dir=model_dir, dataset_dir=dataset_dir)
    return serving_service


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Health check endpoint confirming model artifacts and dataset readiness."""
    service = get_service()
    return HealthResponse(
        status="ok",
        version="1.0.0",
        experiences_loaded=service.get_experiences_count(),
        models_loaded=bool(service.recommendation_engine.model is not None),
    )


@app.post("/recommend", response_model=RecommendationResponse, tags=["Recommendations"])
def recommend_experiences(request: RecommendationRequest):
    """
    Score and rank candidate experiences for a traveler request.
    Applies feasibility filters (affordable and fits_time) and spatial radius if requested.
    """
    service = get_service()
    try:
        results = service.recommend(
            budget_inr=request.budget_inr,
            available_time_hours=request.available_time_hours,
            traveler_count=request.traveler_count,
            group_type=request.group_type,
            interests=request.interests,
            user_lat=request.user_lat,
            user_lon=request.user_lon,
            radius_km=request.radius_km,
            city=request.city,
            category=request.category,
            top_n=request.top_n,
            apply_hard_filters=request.apply_hard_filters,
        )
        return RecommendationResponse(
            status="success",
            count=len(results),
            recommendations=results,
        )
    except Exception as e:
        logger.error(f"Recommendation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recommendation scoring error: {str(e)}",
        )


@app.post("/itinerary", response_model=ItineraryResponse, tags=["Itinerary"])
def generate_itinerary(request: ItineraryRequest):
    """
    Synthesize an optimal multi-stop day itinerary matching budget, time, and route constraints.
    Maximizes total recommendation score via multi-strategy knapsack heuristics.
    """
    service = get_service()
    try:
        itinerary = service.plan_itinerary(
            budget_inr=request.budget_inr,
            available_time_hours=request.available_time_hours,
            traveler_count=request.traveler_count,
            group_type=request.group_type,
            interests=request.interests,
            user_lat=request.user_lat,
            user_lon=request.user_lon,
            radius_km=request.radius_km,
            city=request.city,
            category=request.category,
            max_stops=request.max_stops,
            top_candidates_pool=request.top_candidates_pool,
        )
        return ItineraryResponse(
            status="success",
            **itinerary,
        )
    except Exception as e:
        logger.error(f"Itinerary generation failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Itinerary optimization error: {str(e)}",
        )


@app.post("/experiences", response_model=ExperienceSubmissionResponse, tags=["Provider Experiences"])
def create_experience(submission: ExperienceSubmissionRequest):
    """
    Validate provider experience listing, assign unique ID, update in-memory pool,
    and persist to datasets CSV.
    """
    service = get_service()
    try:
        registered = service.register_experience(submission.model_dump())
        return ExperienceSubmissionResponse(
            status="success",
            message="Experience listing validated and registered successfully.",
            experience_id=registered["experience_id"],
            experience=registered,
        )
    except ValidationError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except Exception as e:
        logger.error(f"Experience registration failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Experience registration error: {str(e)}",
        )


@app.get("/experiences", tags=["Provider Experiences"])
def list_experiences(
    city: Optional[str] = Query(None, description="Filter by city"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
):
    """List loaded experiences with optional filters."""
    service = get_service()
    df = service.recommendation_engine.get_experiences_df()

    if city and "city" in df.columns:
        df = df[df["city"].str.strip().str.lower() == str(city).strip().lower()]
    if category and "category" in df.columns:
        df = df[df["category"].str.strip().str.lower() == str(category).strip().lower()]

    total = len(df)
    sliced = df.iloc[offset : offset + limit].copy()
    # Replace NaN with None for JSON compliance
    clean_records = sliced.astype(object).where(pd.notnull(sliced), None).to_dict(orient="records")

    return {
        "status": "success",
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": clean_records,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", os.getenv("ML_PORT", 8001)))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("ml.inference.app:app", host=host, port=port, reload=False)
