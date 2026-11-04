"""
Nugen AI Service.
Backend-only post-generation itinerary enhancement and validation layer.
Operates AFTER Rajiv's ML itinerary has been generated and NEVER modifies Rajiv's recommendations.
"""
import json
import logging
from typing import Any, Dict, Optional
import httpx

try:
    from backend.app.core.config import settings
    from backend.app.schemas.nugen_schemas import NugenEnhancementResponse
    from backend.app.services.nugen_prompt import (
        NUGEN_SYSTEM_PROMPT,
        build_nugen_payload,
        build_nugen_user_prompt,
    )
    from backend.app.services.nugen_validator import NugenValidator
except ImportError:
    from app.core.config import settings
    from app.schemas.nugen_schemas import NugenEnhancementResponse
    from app.services.nugen_prompt import (
        NUGEN_SYSTEM_PROMPT,
        build_nugen_payload,
        build_nugen_user_prompt,
    )
    from app.services.nugen_validator import NugenValidator

logger = logging.getLogger(__name__)


class NugenService:
    """
    Dedicated Service for Nugen AI Itinerary Enhancement & Validation.
    Acts exclusively as a non-destructive intelligence layer.
    """

    DEFAULT_TIMEOUT_SECONDS: float = 6.0

    @classmethod
    async def enhance_itinerary(
        cls,
        user_constraints: Dict[str, Any],
        generated_itinerary: Dict[str, Any],
        weather: Optional[Dict[str, Any]] = None,
        live_weather: Optional[Dict[str, Any]] = None,
    ) -> Optional[NugenEnhancementResponse]:
        """
        Enhance and validate generated itinerary.
        Returns structured NugenEnhancementResponse or None if disabled.
        """
        # Master feature flag check
        nugen_enabled = getattr(settings, "NUGEN_ENABLED", False)
        if not nugen_enabled:
            logger.info("[NUGEN] Enhancement skipped (NUGEN_ENABLED=false)")
            return None

        logger.info("[NUGEN] Enhancement started")

        try:
            # 1. Build structured payload
            payload = build_nugen_payload(
                user_constraints=user_constraints,
                generated_itinerary=generated_itinerary,
                weather=weather,
            )
            logger.info("[NUGEN] Payload constructed")

            api_key = getattr(settings, "NUGEN_API_KEY", "") or ""
            api_url = getattr(settings, "NUGEN_API_URL", "") or ""
            model_name = getattr(settings, "NUGEN_MODEL", "") or "nugen-flash-instruct"

            # 2. If external Nugen API URL is configured, call remote API
            if api_url and api_url.strip():
                try:
                    logger.info("[NUGEN] Request sent to remote endpoint")
                    user_prompt = build_nugen_user_prompt(payload)

                    headers = {
                        "Content-Type": "application/json",
                    }
                    if api_key:
                        headers["Authorization"] = f"Bearer {api_key}"
                        headers["X-API-Key"] = api_key

                    request_body = {
                        "model": model_name,
                        "messages": [
                            {"role": "system", "content": NUGEN_SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.1,
                        "response_format": {"type": "json_object"},
                    }

                    async with httpx.AsyncClient(timeout=cls.DEFAULT_TIMEOUT_SECONDS) as client:
                        response = await client.post(api_url, json=request_body, headers=headers)

                    if response.status_code == 200:
                        logger.info("[NUGEN] Response received")
                        res_json = response.json()
                        # Extract content if OpenAI/Nugen chat completion structure
                        if "choices" in res_json and len(res_json["choices"]) > 0:
                            content = res_json["choices"][0].get("message", {}).get("content", "")
                            parsed_data = json.loads(content)
                        else:
                            parsed_data = res_json

                        validated = NugenValidator.validate_nugen_response(
                            raw_data=parsed_data,
                            original_itinerary=generated_itinerary,
                            user_constraints=user_constraints,
                            weather=weather,
                            live_weather=live_weather,
                        )
                        logger.info("[NUGEN] Response validated")
                        logger.info("[NUGEN] Enhancement completed")
                        return validated
                    else:
                        logger.warning(
                            f"[NUGEN] API returned status {response.status_code}. "
                            "Falling back to deterministic rule evaluator."
                        )
                except httpx.TimeoutException:
                    logger.warning("[NUGEN] Timeout contacting remote API. Falling back to deterministic rule evaluator.")
                except Exception as api_err:
                    logger.warning(f"[NUGEN] Remote API call failed: {api_err}. Falling back to deterministic rule evaluator.")

            # 3. Deterministic Evaluation Engine (Offline / Fallback / Guaranteed Resilience)
            logger.info("[NUGEN] Executing deterministic validation engine")
            result = NugenValidator.generate_deterministic_evaluation(
                original_itinerary=generated_itinerary,
                user_constraints=user_constraints,
                weather=weather,
                live_weather=live_weather,
            )
            logger.info("[NUGEN] Enhancement completed")
            return result

        except Exception as e:
            logger.error(f"[NUGEN] Unexpected enhancement error: {e}. Falling back gracefully.", exc_info=True)
            return NugenEnhancementResponse(
                enabled=True,
                status="unavailable",
                metadata={"error": "Nugen validation temporarily unavailable"},
                weather=weather,
                live_weather=live_weather,
            )
