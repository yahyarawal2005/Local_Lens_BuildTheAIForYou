"""
AI Document Understanding Service for Driving Licence Extraction via Gemini API.
"""

import base64
import json
import logging
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings
from app.services.smart_validator import SmartLicenseValidator

logger = logging.getLogger("locallens.gemini_dl")

# System Prompt instructing Gemini to output structured JSON only
GEMINI_DL_PROMPT = """
You are an expert Document Processing AI specializing in Indian Driving Licences.

Analyze ONLY the provided document image carefully and extract the core licence fields into a valid JSON object.

CORE FIELDS TO EXTRACT WITH MAXIMUM ACCURACY:
1. "dl_number": The exact Driving Licence Number as printed (e.g., MH1420260012345).
   - Indian DL numbers ALWAYS start with a 2-letter Indian State Code (e.g. MH, DL, KA, RJ, UP, TN, KL, GJ, WB, HR, PB, BR, MP, AP, TS).
   - Standard format: 2 State letters + 2 RTO digits + 4 Year digits + 7 Serial digits = 15 characters (e.g., MH1420260012345 or DL0420191234567).
   - DO NOT extract header text, state names, addresses, or words like "DRIVING LICENCE" or "TRANSPORT" as the dl_number.
   - If the DL number is not clearly visible, unreadable, or invalid, set its "value" to null.
2. "holder_name": The full Name of the Licence Holder (e.g., YAHYA RAWAL).
3. "date_of_birth": The Date of Birth of the holder in ISO 8601 format (YYYY-MM-DD).

RULES:
1. Extract only what is clearly visible in the provided document image.
2. DO NOT invent, hallucinate, or guess missing information.
3. If a field is not present or cannot be read confidently, set its "value" to null.
4. Provide a confidence score (0.00 to 1.00) for every extracted field.
5. Identify the document type ("driving_license" or "other").
6. Identify image quality ("good", "acceptable", "blurry", "unusable").
7. Return ONLY raw structured JSON matching the format below. Do not include markdown codeblocks or explanatory prose.

EXPECTED JSON FORMAT:
{
  "document_type": { "value": "driving_license", "confidence": 0.98 },
  "document_quality": { "value": "good", "confidence": 0.95 },
  "dl_number": { "value": "MH1420260012345", "confidence": 0.98 },
  "holder_name": { "value": "YAHYA RAWAL", "confidence": 0.96 },
  "date_of_birth": { "value": "2005-04-15", "confidence": 0.95 },
  "issue_date": { "value": null, "confidence": 0.0 },
  "valid_until": { "value": null, "confidence": 0.0 },
  "vehicle_classes": { "value": ["LMV"], "confidence": 0.90 },
  "issuing_authority": { "value": null, "confidence": 0.0 }
}
"""


class GeminiDLService:
    """
    Multimodal AI document understanding service for Driving Licence analysis.
    """

    @classmethod
    async def analyze_licence_image(
        cls,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        rider_vehicle_type: str = "Sedan",
        ocr_dl_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send document image to Gemini Vision API, parse structured JSON,
        and run deterministic validation rules.
        """
        api_key = getattr(settings, "LLM_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")

        if not api_key:
            logger.warning("[GeminiDL] LLM_API_KEY not set in configuration. Using fallback deterministic validation.")
            return cls._fallback_ocr_validation(image_bytes, rider_vehicle_type, ocr_dl_number)

        try:
            b64_image = base64.b64encode(image_bytes).decode("utf-8")

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": GEMINI_DL_PROMPT},
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": b64_image
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.0,
                    "topP": 0.9,
                    "maxOutputTokens": 256
                }
            }

            async with httpx.AsyncClient(timeout=3.5) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                res_data = response.json()

            # Parse text candidate from Gemini response
            candidates = res_data.get("candidates", [])
            if not candidates:
                logger.error("[GeminiDL] No candidates returned from Gemini API.")
                return cls._fallback_ocr_validation(image_bytes, rider_vehicle_type, ocr_dl_number)

            text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            logger.info(f"[GeminiDL] Gemini raw response:\n{text_content}")

            # Strip markdown ```json ``` wraps if present
            cleaned_json_text = text_content.strip()
            if cleaned_json_text.startswith("```"):
                lines = cleaned_json_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_json_text = "\n".join(lines).strip()

            extracted_data = json.loads(cleaned_json_text)
            
            # Run deterministic smart validation engine on extracted JSON
            return SmartLicenseValidator.evaluate(
                extracted_data=extracted_data,
                rider_vehicle_type=rider_vehicle_type,
                ocr_dl_number=ocr_dl_number
            )

        except Exception as e:
            logger.error(f"[GeminiDL] Error calling Gemini API: {e}", exc_info=True)
            return cls._fallback_ocr_validation(image_bytes, rider_vehicle_type, ocr_dl_number)

    @classmethod
    def _fallback_ocr_validation(
        cls,
        image_bytes: bytes,
        rider_vehicle_type: str,
        ocr_dl_number: Optional[str]
    ) -> Dict[str, Any]:
        """
        Fallback when Gemini API key is missing or network call fails.
        Converts available OCR text into structured payload.
        """
        clean_dl = SmartLicenseValidator.normalize_dl_number(ocr_dl_number or "")
        is_valid = SmartLicenseValidator.validate_indian_dl_format(clean_dl)

        mock_extracted = {
            "document_type": {"value": "driving_license", "confidence": 0.85},
            "document_quality": {"value": "acceptable", "confidence": 0.80},
            "dl_number": {"value": clean_dl if is_valid else "", "confidence": 0.85 if is_valid else 0.0},
            "holder_name": {"value": None, "confidence": 0.0},
            "date_of_birth": {"value": None, "confidence": 0.0},
            "issue_date": {"value": None, "confidence": 0.0},
            "valid_until": {"value": None, "confidence": 0.0},
            "vehicle_classes": {"value": ["LMV" if rider_vehicle_type != "Bike" else "MCWG"], "confidence": 0.80},
            "issuing_authority": {"value": clean_dl[:4] if len(clean_dl) >= 4 else None, "confidence": 0.70}
        }

        result = SmartLicenseValidator.evaluate(
            extracted_data=mock_extracted,
            rider_vehicle_type=rider_vehicle_type,
            ocr_dl_number=ocr_dl_number
        )
        result["verification_method"] = "ml_kit_ocr_fallback"
        if not is_valid:
            result["warnings"].append("AI service unavailable. Using local OCR fallback. Please confirm DL number.")
        return result
