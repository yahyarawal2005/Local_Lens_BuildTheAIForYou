"""
Smart Driving Licence Deterministic Validation Engine.
Performs format validation, date consistency checks, vehicle compatibility checks,
OCR/AI agreement scoring, and final decision rules (VERIFIED / REVIEW / REJECTED).
"""

import re
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple


class SmartLicenseValidator:
    """
    Deterministic validation engine for Indian Driving Licences.
    Evaluates AI-extracted structured data and OCR signals.
    """

    # Compatible DL vehicle classes mapped to Rider vehicle categories
    VEHICLE_CLASS_MAP = {
        "Sedan": {"LMV", "LMV-NT", "LMV-TR", "CAR", "TRANS", "3W-CAB", "MOTOR CAR"},
        "Hatchback": {"LMV", "LMV-NT", "LMV-TR", "CAR", "TRANS", "MOTOR CAR"},
        "SUV": {"LMV", "LMV-NT", "LMV-TR", "CAR", "TRANS", "MOTOR CAR", "PSV"},
        "Auto": {"3W", "3W-CAB", "AUTO", "LCRV", "LMV", "3-WHEELER"},
        "Bike": {"MCWG", "MCWOG", "M/CYCL", "2W", "TWO WHEELER", "MOTORCYCLE"},
        "Other": {"LMV", "MCWG", "3W", "TRANS"}
    }

    @classmethod
    def normalize_dl_number(cls, raw: str) -> str:
        """
        Normalize DL string: uppercase, strip spaces, linebreaks, non-alphanumeric chars.
        """
        if not raw:
            return ""
        return re.sub(r'[^A-Z0-9]', '', raw.upper())

    INDIAN_STATE_CODES = {
        'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DN', 'DL', 'GA', 'GJ',
        'HR', 'HP', 'JK', 'JH', 'KA', 'KL', 'LA', 'LD', 'MP', 'MH', 'MN', 'ML',
        'MZ', 'NL', 'OD', 'PB', 'PY', 'RJ', 'SK', 'TN', 'TS', 'TR', 'UP', 'UK', 'UA', 'WB'
    }

    @classmethod
    def validate_indian_dl_format(cls, dl_number: str) -> bool:
        """
        Validate standard 15-character Indian DL format or 13-16 character legacy format.
        Must start with a valid 2-letter Indian State Code (e.g. MH, DL, KA, RJ).
        Must contain at least 7 numeric digits.
        """
        clean = cls.normalize_dl_number(dl_number)
        if len(clean) < 13 or len(clean) > 16:
            return False

        state_code = clean[:2]
        if state_code not in cls.INDIAN_STATE_CODES:
            return False

        # Require at least 7 numeric digits (Standard DLs have 13 digits)
        digit_count = sum(c.isdigit() for c in clean)
        if digit_count < 7:
            return False

        # Strict 15-char standard pattern (SS-RR-YYYY-NNNNNNN)
        if re.match(r'^[A-Z]{2}[0-9]{2}(?:19|20)[0-9]{2}[0-9]{7}$', clean):
            return True

        # Flexible pattern (legacy DLs)
        return bool(re.match(r'^[A-Z]{2}[0-9A-Z]{11,14}$', clean))

    @classmethod
    def parse_date(cls, val: Any) -> Optional[date]:
        """
        Parse ISO string or date format (YYYY-MM-DD, DD/MM/YYYY, etc.) into Python date object.
        """
        if not val or not isinstance(val, str):
            return None
        val_str = val.strip()

        # Try ISO format YYYY-MM-DD
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(val_str, fmt).date()
            except ValueError:
                pass
        return None

    @classmethod
    def check_vehicle_compatibility(cls, rider_vehicle_type: str, dl_vehicle_classes: List[str]) -> Tuple[bool, str]:
        """
        Check if rider selected vehicle type matches any of the vehicle classes on DL.
        """
        if not rider_vehicle_type:
            return True, "Vehicle type not specified; skipped check."

        allowed_set = cls.VEHICLE_CLASS_MAP.get(rider_vehicle_type, {"LMV", "MCWG", "3W"})
        upper_classes = {cls_str.strip().upper() for cls_str in dl_vehicle_classes if cls_str}

        # Check direct or substring match (e.g. LMV in LMV-NT)
        is_compatible = False
        matched_class = ""
        for user_cls in upper_classes:
            for target in allowed_set:
                if target in user_cls or user_cls in target:
                    is_compatible = True
                    matched_class = user_cls
                    break
            if is_compatible:
                break

        if is_compatible:
            return True, f"Licence class '{matched_class}' is compatible with selected vehicle '{rider_vehicle_type}'."
        elif not upper_classes:
            return True, "No vehicle classes extracted; compatibility check marked neutral."
        else:
            classes_str = ", ".join(dl_vehicle_classes)
            return False, f"Licence vehicle classes ({classes_str}) may not authorize operating a '{rider_vehicle_type}'."

    @classmethod
    def evaluate(
        cls,
        extracted_data: Dict[str, Any],
        rider_vehicle_type: str = "Sedan",
        ocr_dl_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive evaluation of extracted DL payload against deterministic rules.
        """
        warnings = []
        checks = {
            "document_type": False,
            "image_quality": False,
            "dl_number_format": False,
            "date_consistency": True,
            "vehicle_compatibility": False,
            "ocr_ai_agreement": False
        }

        # 1. Document Type Check
        doc_type_info = extracted_data.get("document_type", {})
        doc_type = (doc_type_info.get("value") or "").lower()
        if "driving" in doc_type or "license" in doc_type or "licence" in doc_type or "dl" in doc_type:
            checks["document_type"] = True
        else:
            warnings.append(f"Document type detected as '{doc_type or 'unknown'}' rather than a Driving Licence.")

        # 2. Image Quality Check
        quality_info = extracted_data.get("document_quality", {})
        doc_quality = (quality_info.get("value") or "good").lower()
        if doc_quality in ("good", "acceptable", "clear", "high"):
            checks["image_quality"] = True
        else:
            warnings.append(f"Document image quality marked as '{doc_quality}'. Text may be hard to read.")

        # 3. DL Number Extraction & Format Check
        dl_info = extracted_data.get("dl_number", {})
        ai_dl_number = cls.normalize_dl_number(dl_info.get("value") or "")
        
        is_ai_valid = cls.validate_indian_dl_format(ai_dl_number)
        if is_ai_valid:
            checks["dl_number_format"] = True
        else:
            if ai_dl_number:
                warnings.append(f"Extracted DL number '{ai_dl_number}' does not match standard Indian DL format.")
            else:
                warnings.append("Could not extract a valid Driving Licence number from the image.")

        # 4. OCR / AI Agreement Check
        clean_ocr_dl = cls.normalize_dl_number(ocr_dl_number or "")
        has_ocr_signal = bool(clean_ocr_dl and cls.validate_indian_dl_format(clean_ocr_dl))
        if has_ocr_signal and ai_dl_number:
            if clean_ocr_dl == ai_dl_number:
                checks["ocr_ai_agreement"] = True
            else:
                checks["ocr_ai_agreement"] = False
                warnings.append(f"AI extracted DL ({ai_dl_number}) differs from ML Kit OCR ({clean_ocr_dl}).")
        else:
            checks["ocr_ai_agreement"] = False

        # 5. Date Consistency Checks
        dob = cls.parse_date(extracted_data.get("date_of_birth", {}).get("value"))
        issue_dt = cls.parse_date(extracted_data.get("issue_date", {}).get("value"))
        valid_until = cls.parse_date(extracted_data.get("valid_until", {}).get("value"))

        today = date.today()

        if dob and issue_dt and dob > issue_dt:
            checks["date_consistency"] = False
            warnings.append(f"Date of birth ({dob}) is after issue date ({issue_dt}).")

        if issue_dt and valid_until and issue_dt > valid_until:
            checks["date_consistency"] = False
            warnings.append(f"Issue date ({issue_dt}) is after validity date ({valid_until}).")

        if valid_until and valid_until < today:
            checks["date_consistency"] = False
            warnings.append(f"Licence expired on {valid_until}.")

        # 6. Vehicle Compatibility Check
        vehicle_classes_info = extracted_data.get("vehicle_classes", {})
        classes_list = vehicle_classes_info.get("value") or []
        if isinstance(classes_list, str):
            classes_list = [classes_list]

        is_compat, compat_msg = cls.check_vehicle_compatibility(rider_vehicle_type, classes_list)
        checks["vehicle_compatibility"] = is_compat
        if not is_compat:
            warnings.append(compat_msg)

        # 7. Multi-Signal Confidence Score & Status Determination
        holder_name = (extracted_data.get("holder_name", {}).get("value") or "").strip()
        dob_val = (extracted_data.get("date_of_birth", {}).get("value") or "").strip()

        if not checks["dl_number_format"]:
            confidence = 0.20 if ai_dl_number else 0.00
            status = "rejected"
            invalid_val = ai_dl_number or clean_ocr_dl or "None"
            reason = f"Extracted DL Number '{invalid_val}' is invalid (failed Indian DL format check). Please re-upload or edit."
        else:
            score = 0.40  # Base for valid DL number format
            if holder_name:
                score += 0.20
            if dob_val:
                score += 0.20
            if checks["image_quality"]:
                score += 0.10
            if checks["ocr_ai_agreement"]:
                score += 0.10

            confidence = round(score, 2)

            if confidence < 0.60 or not checks["document_type"]:
                status = "rejected"
                reason = "Document could not be verified as a valid Indian Driving Licence."
            elif confidence < 0.80 or not holder_name or not dob_val:
                status = "review"
                reason = "DL Number validated, but Name or Date of Birth requires review."
            else:
                status = "verified"
                reason = "Driving Licence details (DL Number, Name, DOB) successfully validated."

        return {
            "status": status,
            "confidence": confidence,
            "reason": reason,
            "extracted": {
                "dl_number": ai_dl_number or clean_ocr_dl,
                "name": extracted_data.get("holder_name", {}).get("value"),
                "dob": extracted_data.get("date_of_birth", {}).get("value"),
                "issue_date": extracted_data.get("issue_date", {}).get("value"),
                "valid_until": extracted_data.get("valid_until", {}).get("value"),
                "vehicle_classes": classes_list,
                "document_type": doc_type or "driving_license",
                "document_quality": doc_quality or "good",
                "issuing_authority": extracted_data.get("issuing_authority", {}).get("value")
            },
            "checks": checks,
            "warnings": warnings,
            "verification_method": "ai_multimodal"
        }
