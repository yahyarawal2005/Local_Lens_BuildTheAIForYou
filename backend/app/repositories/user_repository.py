"""
User Repository.
Data access operations for users, travelers, providers, and riders.
"""
from sqlalchemy.orm import Session


class UserRepository:
    """Repository handling User and account-related database interactions."""

    def __init__(self, db: Session):
        self.db = db
