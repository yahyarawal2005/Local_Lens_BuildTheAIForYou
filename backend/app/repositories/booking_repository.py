"""
Booking Repository.
Data access operations for experience reservations and payments.
"""
from sqlalchemy.orm import Session


class BookingRepository:
    """Repository handling Booking database interactions."""

    def __init__(self, db: Session):
        self.db = db
