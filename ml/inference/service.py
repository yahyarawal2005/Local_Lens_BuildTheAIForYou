"""
ML Serving Service layer.
Manages the lifecycle of RecommendationEngine, ItineraryOptimizer, and ExperienceValidator.
Loads model artifacts once at startup in memory for sub-millisecond real-time inference.
"""
from typing import Any, Dict, List, Optional, Union
import logging
from ml.experience_quality.validator import ExperienceValidator
from ml.itinerary.optimizer import ItineraryOptimizer
from ml.recommendation.engine import RecommendationEngine

logger = logging.getLogger(__name__)


class MLServingService:
    """
    Unified singleton service layer for ML recommendations, itinerary planning,
    and provider experience registration.
    """

    _instance: Optional["MLServingService"] = None

    def __init__(
        self,
        model_dir: Optional[str] = None,
        dataset_dir: Optional[str] = None,
    ):
        logger.info("Initializing ML Serving Service...")
        self.recommendation_engine = RecommendationEngine(
            model_dir=model_dir, dataset_dir=dataset_dir
        )
        self.itinerary_optimizer = ItineraryOptimizer()
        self.experience_validator = ExperienceValidator(
            dataset_path=self.recommendation_engine.dataset_path
        )
        logger.info("ML Serving Service initialized successfully.")

    @classmethod
    def get_instance(
        cls,
        model_dir: Optional[str] = None,
        dataset_dir: Optional[str] = None,
    ) -> "MLServingService":
        """Get or create singleton instance."""
        if cls._instance is None:
            cls._instance = cls(model_dir=model_dir, dataset_dir=dataset_dir)
        return cls._instance

    def recommend(
        self,
        budget_inr: float,
        available_time_hours: float,
        traveler_count: int = 1,
        group_type: str = "Solo",
        interests: Union[str, List[str]] = "",
        user_lat: Optional[float] = None,
        user_lon: Optional[float] = None,
        radius_km: Optional[float] = None,
        city: Optional[str] = None,
        category: Optional[str] = None,
        top_n: int = 10,
        apply_hard_filters: bool = True,
    ) -> List[Dict[str, Any]]:
        """Generate ranked recommendations."""
        return self.recommendation_engine.recommend(
            budget_inr=budget_inr,
            available_time_hours=available_time_hours,
            traveler_count=traveler_count,
            group_type=group_type,
            interests=interests,
            user_lat=user_lat,
            user_lon=user_lon,
            radius_km=radius_km,
            city=city,
            category=category,
            top_n=top_n,
            apply_hard_filters=apply_hard_filters,
        )

    def plan_itinerary(
        self,
        budget_inr: float,
        available_time_hours: float,
        traveler_count: int = 1,
        group_type: str = "Solo",
        interests: Union[str, List[str]] = "",
        user_lat: Optional[float] = None,
        user_lon: Optional[float] = None,
        radius_km: Optional[float] = None,
        city: Optional[str] = None,
        category: Optional[str] = None,
        max_stops: int = 5,
        top_candidates_pool: int = 30,
    ) -> Dict[str, Any]:
        """
        Score candidate experiences and optimize multi-stop itinerary within budget and time.
        """
        # First retrieve top scored candidates (with hard filters enabled)
        candidates = self.recommendation_engine.recommend(
            budget_inr=budget_inr,
            available_time_hours=available_time_hours,
            traveler_count=traveler_count,
            group_type=group_type,
            interests=interests,
            user_lat=user_lat,
            user_lon=user_lon,
            radius_km=radius_km,
            city=city,
            category=category,
            top_n=top_candidates_pool,
            apply_hard_filters=True,
        )

        # Optimize knapsack combination and route ordering
        return self.itinerary_optimizer.optimize_itinerary(
            candidate_experiences=candidates,
            available_time_hours=available_time_hours,
            budget_inr=budget_inr,
            user_lat=user_lat,
            user_lon=user_lon,
            max_stops=max_stops,
        )

    def register_experience(self, submission_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Validate, register, and append new provider experience listing."""
        return self.experience_validator.register_experience(
            submission=submission_dict,
            recommendation_engine=self.recommendation_engine,
        )

    def get_experiences_count(self) -> int:
        """Return count of loaded experiences in memory."""
        return len(self.recommendation_engine.experiences_df)
