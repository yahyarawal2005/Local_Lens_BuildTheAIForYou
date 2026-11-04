"""
Inference and serving package for LocalLens ML.
"""
from ml.inference.app import app
from ml.inference.service import MLServingService

__all__ = ["app", "MLServingService"]
