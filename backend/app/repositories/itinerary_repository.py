"""
Itinerary Repository.
Data access operations for saved itineraries, itinerary items, and route legs.
"""
from sqlalchemy.orm import Session


class ItineraryRepository:
    """Repository handling Itinerary database interactions."""

    def __init__(self, db: Session):
        self.db = db
