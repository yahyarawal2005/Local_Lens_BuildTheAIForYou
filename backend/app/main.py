"""
LocalLens Backend Application Entrypoint.
Intelligent Discovery, ML Recommendation, and Itinerary Generation Service.
"""
import sys
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent
_workspace_root = _backend_dir.parent
if str(_workspace_root) not in sys.path:
    sys.path.insert(0, str(_workspace_root))
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from backend.app.core.config import settings
from backend.app.core.exceptions import (
    TravelerApiException,
    global_exception_handler,
    traveler_api_exception_handler,
    validation_exception_handler,
)
from backend.app.core.logging import RequestIdMiddleware, setup_logging

# Existing legacy / client compatibility routers
from backend.app.api.recommendations.recommendation_routes import router as recommendation_router
from backend.app.api.itinerary.itinerary_routes import router as itinerary_router

# Production V1 Architecture Routers
from backend.app.api.routes.health import router as health_router
from backend.app.api.routes.profiles import router as profiles_router
from backend.app.api.routes.destinations import router as destinations_router
from backend.app.api.routes.weather import router as weather_router
from backend.app.api.routes.discovery import router as discovery_router
from backend.app.api.routes.itineraries import router as itineraries_v1_router
from backend.app.api.routes.saved_places import router as saved_places_router
from backend.app.api.routes.feedback import router as feedback_router
from backend.app.api.routes.experiences import router as experiences_router
from backend.app.api.routes.maps import router as maps_router
from backend.app.api.routes.preferences import router as preferences_router

# Setup structured logging
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Exception handlers
app.add_exception_handler(TravelerApiException, traveler_api_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Request ID tracking middleware
app.add_middleware(RequestIdMiddleware)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Include Routers
# ------------------------------------------------------------------------------

# Health
app.include_router(health_router)

# V1 API Routes
app.include_router(profiles_router, prefix=settings.API_V1_STR)
app.include_router(preferences_router, prefix=settings.API_V1_STR)
app.include_router(destinations_router, prefix=settings.API_V1_STR)
app.include_router(weather_router, prefix=settings.API_V1_STR)
app.include_router(experiences_router, prefix=settings.API_V1_STR)
app.include_router(discovery_router, prefix=settings.API_V1_STR)
app.include_router(itineraries_v1_router, prefix=settings.API_V1_STR)
app.include_router(saved_places_router, prefix=settings.API_V1_STR)
app.include_router(feedback_router, prefix=settings.API_V1_STR)
app.include_router(maps_router, prefix=settings.API_V1_STR)

# Existing / Backwards-compatibility Routes (used by existing web & mobile screens)
app.include_router(recommendation_router, prefix="/api/recommendations")
app.include_router(recommendation_router, prefix=f"{settings.API_V1_STR}/recommendations")
app.include_router(itinerary_router, prefix="/api/itinerary")
app.include_router(itinerary_router, prefix=f"{settings.API_V1_STR}/itinerary")
