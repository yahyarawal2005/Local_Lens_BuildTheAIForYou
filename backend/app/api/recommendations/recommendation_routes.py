"""
Recommendation API Endpoints.
Exposes POST /api/recommendations to score and rank experiences using Gemini AI and Supabase context.
"""
from fastapi import APIRouter, HTTPException, status
import logging

# ML recommendation system retained for future integration.
# Currently disconnected from the active recommendation pipeline.
try:
    from backend.app.services.recommendation_service import RecommendationService
except ImportError:
    from app.services.recommendation_service import RecommendationService

try:
    from backend.app.schemas.recommendation_schemas import (
        RecommendationRequest,
        RecommendationResponse,
        SmartSearchRequest,
        SmartSearchResponse,
    )
    from backend.app.services.gemini_recommendation_service import GeminiRecommendationService
except ImportError:
    from app.schemas.recommendation_schemas import (
        RecommendationRequest,
        RecommendationResponse,
        SmartSearchRequest,
        SmartSearchResponse,
    )
    from app.services.gemini_recommendation_service import GeminiRecommendationService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Recommendations"])


@router.post("", response_model=RecommendationResponse)
@router.post("/", response_model=RecommendationResponse, include_in_schema=False)
async def get_recommendations(request: RecommendationRequest):
    """
    Score and rank personalized experience recommendations for traveler preferences.
    Uses Gemini AI recommendation engine, Supabase context data, trip-date weather forecast, and real image discovery.
    """
    try:
        response = await GeminiRecommendationService.get_recommendations(request)
        return response
    except Exception as e:
        logger.error(f"Error generating Gemini recommendations: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "RECOMMENDATION_FAILED",
                "message": f"Failed to generate recommendations: {str(e)}",
            },
        )


@router.post("/smart-search", response_model=SmartSearchResponse)
async def smart_search_recommendations(request: SmartSearchRequest):
    """
    NLP & Semantic Intent Search for Traveler Home Screen Search Bar.
    Extracts travel intent and parameters from natural language queries
    and immediately returns ranked recommendations via Gemini.
    """
    try:
        response = await GeminiRecommendationService.execute_smart_search(request)
        return response
    except Exception as e:
        logger.error(f"Error executing smart search: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "SMART_SEARCH_FAILED",
                "message": f"Failed to execute smart search: {str(e)}",
            },
        )


@router.post("/sync")
@router.get("/sync")
async def sync_supabase_experiences():
    """
    Manually synchronize the ML recommendation engine with the Supabase experience table.
    Pulls newly registered provider listings, cleans attributes, and merges into active candidate pool.
    """
    try:
        sync_result = RecommendationService.sync_with_supabase(force=True)
        return {
            "status": "success",
            "message": "ML engine synchronized with Supabase experience table",
            "data": sync_result,
        }
    except Exception as e:
        logger.error(f"Error syncing with Supabase: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "SYNC_FAILED",
                "message": f"Failed to synchronize ML engine with Supabase: {str(e)}",
            },
        )
