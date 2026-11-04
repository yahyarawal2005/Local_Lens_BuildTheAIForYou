"""
Nugen Models Module.
Re-exports Pydantic schemas for the Nugen AI enhancement layer.
"""
try:
    from backend.app.schemas.nugen_schemas import (
        NugenValidationItem,
        NugenValidation,
        NugenIssue,
        NugenEnhancement,
        NugenPersonalizedTip,
        NugenRecommendation,
        NugenEnhancementResponse,
    )
except ImportError:
    from app.schemas.nugen_schemas import (
        NugenValidationItem,
        NugenValidation,
        NugenIssue,
        NugenEnhancement,
        NugenPersonalizedTip,
        NugenRecommendation,
        NugenEnhancementResponse,
    )

__all__ = [
    "NugenValidationItem",
    "NugenValidation",
    "NugenIssue",
    "NugenEnhancement",
    "NugenPersonalizedTip",
    "NugenRecommendation",
    "NugenEnhancementResponse",
]
