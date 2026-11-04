"""
Weather-Smart Discovery Canvas API Endpoints (V1).
Categorizes, ranks, and grounds places using ML scores and meteorological context.
"""
from typing import Any, Dict, List
from fastapi import APIRouter
from backend.app.schemas.discovery_schemas import DiscoveryRequest, DiscoveryResponse
from backend.app.services.discovery_service import CATEGORY_BUCKETS, DiscoveryService

router = APIRouter(prefix="/discovery", tags=["Discovery"])


@router.post("/recommendations", response_model=DiscoveryResponse)
async def get_discovery_recommendations(request: DiscoveryRequest):
    """
    Returns categorized discovery recommendations (Food, Culture, Adventure, Nature, Indoor, Shopping)
    adapted to the trip destination and real weather forecast.
    """
    return await DiscoveryService.get_discovery_canvas(request)


@router.get("/categories")
async def get_discovery_categories() -> Dict[str, Any]:
    """
    Retrieve available Weather-Smart Discovery Canvas categories and themes.
    """
    return {
        "success": True,
        "count": len(CATEGORY_BUCKETS),
        "categories": [
            {
                "id": b["id"],
                "title": b["title"],
                "keywords": b["keywords"],
            }
            for b in CATEGORY_BUCKETS
        ],
    }
