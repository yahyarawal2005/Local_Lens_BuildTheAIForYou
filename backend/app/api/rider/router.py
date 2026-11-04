"""
Rider API Module Router.
"""

from fastapi import APIRouter
from app.api.rider.dl_validator import router as dl_validator_router

rider_router = APIRouter()
rider_router.include_router(dl_validator_router)
