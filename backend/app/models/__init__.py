"""
SQLAlchemy database models package.
Import all ORM models here so Alembic and Base metadata detect them.
"""
from app.core.database import Base

__all__ = ["Base"]
