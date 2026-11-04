"""
Driving Licence Validation API Router.
Endpoint for AI-based Indian Driving Licence analysis, extraction & verification.
"""

from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, status
from app.services.gemini_dl_service import GeminiDLService

router = APIRouter(prefix="/rider", tags=["Rider Licence Verification"])


@router.post(
    "/validate-driving-license",
    status_code=status.HTTP_200_OK,
    summary="Validate Indian Driving Licence using AI & Deterministic Rules"
)
async def validate_driving_license(
    image: UploadFile = File(...),
    vehicle_type: str = Form("Sedan"),
    ocr_dl_number: Optional[str] = Form(None)
):
    """
    Accepts a Driving Licence image file and selected vehicle type.
    Parses document with Gemini Multimodal AI, extracts structured fields,
    evaluates consistency & vehicle compatibility, and returns confidence score + status.
    """
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a valid image (JPEG, PNG, WEBP, etc.)"
        )

    try:
        contents = await image.read()
        if len(contents) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded image file is empty."
            )

        result = await GeminiDLService.analyze_licence_image(
            image_bytes=contents,
            mime_type=image.content_type,
            rider_vehicle_type=vehicle_type,
            ocr_dl_number=ocr_dl_number
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing driving licence: {str(e)}"
        )
