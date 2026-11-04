"""
Nugen AI Pydantic Schemas.
Models for structured itinerary validation, issue detection, and enhancement layer.
"""
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class NugenValidationItem(BaseModel):
    """Individual constraint validation status and explanation."""
    status: Literal["pass", "warning", "fail", "unknown"] = "unknown"
    message: str = ""


class NugenValidation(BaseModel):
    """Comprehensive validation covering all 6 domain rules."""
    budget: NugenValidationItem = Field(default_factory=NugenValidationItem)
    available_time: NugenValidationItem = Field(default_factory=NugenValidationItem)
    selected_place_count: NugenValidationItem = Field(default_factory=NugenValidationItem)
    interests: NugenValidationItem = Field(default_factory=NugenValidationItem)
    group_type: NugenValidationItem = Field(default_factory=NugenValidationItem)
    schedule: NugenValidationItem = Field(default_factory=NugenValidationItem)


class NugenIssue(BaseModel):
    """Detected scheduling conflict, budget warning, or constraint violation."""
    type: str = "general"
    severity: Literal["low", "medium", "high"] = "low"
    message: str = ""
    affected_items: List[str] = Field(default_factory=list)


class NugenEnhancement(BaseModel):
    """Non-destructive practical enhancement suggestion."""
    type: str = "practical_tip"
    suggestion: str = ""
    reason: str = ""
    based_on: str = "constraints"


class NugenPersonalizedTip(BaseModel):
    """Personalized tip tailored to traveler group or preferences."""
    tip: str = ""
    reason: str = ""


class NugenRecommendation(BaseModel):
    """Advisory recommendation clearly tagged with source attribution."""
    type: str = "advisory"
    recommendation: str = ""
    reason: str = ""
    source: str = "nugen"


class NugenEnhancementResponse(BaseModel):
    """
    Complete structured response returned by Nugen AI Enhancement Layer.
    Guarantees isolation from Rajiv's generated itinerary data.
    """
    enabled: bool = True
    status: Literal["success", "unavailable", "disabled", "fallback"] = "success"
    validation: NugenValidation = Field(default_factory=NugenValidation)
    issues: List[NugenIssue] = Field(default_factory=list)
    enhancements: List[NugenEnhancement] = Field(default_factory=list)
    personalized_tips: List[NugenPersonalizedTip] = Field(default_factory=list)
    final_recommendations: List[NugenRecommendation] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None
    weather: Optional[Dict[str, Any]] = None
    live_weather: Optional[Dict[str, Any]] = None
