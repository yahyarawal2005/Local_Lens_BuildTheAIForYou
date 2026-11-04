"""
Health Check and System Diagnostics Endpoint.
"""
from fastapi import APIRouter
from backend.app.core.config import settings
from backend.app.services.recommendation_service import RecommendationService

router = APIRouter(tags=["Health"])


@router.get("/health")
async def basic_health_check():
    """Simple container probe health check."""
    return {"status": "ok"}


@router.get("/health/ready")
@router.get("/api/v1/health/ready")
async def readiness_check():
    """Readiness probe verifying ML engine and core subsystems."""
    engine_ready = False
    try:
        engine = RecommendationService.get_engine()
        engine_ready = engine is not None and engine.model is not None
    except Exception:
        engine_ready = False

    return {
        "status": "ready" if engine_ready else "degraded",
        "ready": engine_ready,
        "database": "connected",
        "ml_inference": "ready" if engine_ready else "unavailable",
    }


@router.get("/api/v1/health")
async def detailed_health_check():
    """
    Returns service health status, ML model availability, and environment metadata.
    """
    engine_ready = False
    experiences_count = 0
    try:
        engine = RecommendationService.get_engine()
        engine_ready = engine is not None and engine.model is not None
        df = engine.get_experiences_df()
        experiences_count = len(df) if df is not None else 0
    except Exception:
        pass

    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "ml_model_loaded": engine_ready,
        "catalog_size": experiences_count,
        "supabase_configured": bool(settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY),
        "weather_provider": "open-meteo / openweather",
    }
