"""
Experience Repository.
Data access operations for experiences, availability slots, and reviews.
"""
from sqlalchemy.orm import Session


class ExperienceRepository:
    """Repository handling Experience catalog and availability database interactions."""

    def __init__(self, db: Session):
        self.db = db
