"""
Unit tests for ExperienceValidator (provider experience quality validation).
"""
import pytest
import tempfile
from pathlib import Path
import pandas as pd

from ml.experience_quality.validator import ExperienceValidator, ValidationError
from ml.recommendation.engine import RecommendationEngine


@pytest.fixture
def validator_with_temp_csv():
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        # Create minimal CSV with standard schema
        df = pd.DataFrame([
            {
                "experience_id": "TEST-001",
                "experience_name": "Sample Heritage Walk",
                "category": "Heritage & Culture",
                "sub_category": "Walking Tour",
                "city": "Delhi",
                "price_inr": 500.0,
                "price_inr_clean": 500.0,
                "duration_hours": 2.0,
                "duration_hours_clean": 2.0,
                "latitude": 28.6139,
                "longitude": 77.2090,
                "local_experience_bool": True,
                "hidden_gem_bool": False,
                "rating_missing": True,
                "indoor_outdoor_clean": "Outdoor",
            }
        ])
        df.to_csv(tmp.name, index=False)
        tmp_path = Path(tmp.name)

    validator = ExperienceValidator(dataset_path=tmp_path)
    yield validator

    # Cleanup
    if tmp_path.exists():
        tmp_path.unlink()


def test_validator_accepts_valid_submission(validator_with_temp_csv):
    valid_data = {
        "experience_name": "Authentic Chai & Samosa Tasting",
        "category": "Culinary",
        "sub_category": "Street Food",
        "city": "Delhi",
        "price_inr": 250.0,
        "duration_hours": 1.5,
        "latitude": 28.6500,
        "longitude": 77.2300,
        "min_group_size": 1,
        "max_group_size": 8,
        "local_experience_bool": True,
        "hidden_gem_bool": True,
        "image_url": "https://images.unsplash.com/photo-1544717305-2782549b5136",
    }

    sanitized = validator_with_temp_csv.validate_submission(valid_data)
    assert sanitized["experience_name"] == "Authentic Chai & Samosa Tasting"
    assert sanitized["price_inr_clean"] == 250.0
    assert sanitized["duration_hours_clean"] == 1.5
    assert sanitized["city"] == "Delhi"
    assert sanitized["image_url"] == "https://images.unsplash.com/photo-1544717305-2782549b5136"


def test_validator_rejects_missing_image(validator_with_temp_csv):
    no_image_data = {
        "experience_name": "No Image Heritage Walk",
        "category": "Heritage & Culture",
        "city": "Delhi",
        "price_inr": 350.0,
        "duration_hours": 2.0,
    }
    with pytest.raises(ValidationError, match="An image of the shop or experience listing is compulsory"):
        validator_with_temp_csv.validate_submission(no_image_data)


def test_validator_rejects_negative_price(validator_with_temp_csv):
    invalid_data = {
        "experience_name": "Negative Price Tour",
        "category": "Adventure",
        "city": "Delhi",
        "price_inr": -100.0,
        "duration_hours": 2.0,
        "latitude": 28.61,
        "longitude": 77.21,
        "image_url": "https://example.com/tour.jpg",
    }
    with pytest.raises(ValidationError, match="price_inr must be non-negative"):
        validator_with_temp_csv.validate_submission(invalid_data)


def test_validator_rejects_zero_or_negative_duration(validator_with_temp_csv):
    invalid_data = {
        "experience_name": "Zero Duration Tour",
        "category": "Adventure",
        "city": "Delhi",
        "price_inr": 500.0,
        "duration_hours": 0.0,
        "latitude": 28.61,
        "longitude": 77.21,
        "image_url": "https://example.com/tour.jpg",
    }
    with pytest.raises(ValidationError, match="duration_hours must be strictly positive"):
        validator_with_temp_csv.validate_submission(invalid_data)


def test_validator_rejects_invalid_coordinates(validator_with_temp_csv):
    invalid_data = {
        "experience_name": "Out of Bounds Tour",
        "category": "Adventure",
        "city": "Delhi",
        "price_inr": 500.0,
        "duration_hours": 2.0,
        "latitude": 120.0,  # invalid latitude > 90
        "longitude": 77.21,
        "image_url": "https://example.com/tour.jpg",
    }
    with pytest.raises(ValidationError, match="latitude must be between -90.0 and 90.0"):
        validator_with_temp_csv.validate_submission(invalid_data)


def test_validator_rejects_missing_category_or_name(validator_with_temp_csv):
    invalid_data = {
        "experience_name": "",
        "category": "   ",
        "city": "Delhi",
        "price_inr": 500.0,
        "duration_hours": 2.0,
        "image_url": "https://example.com/tour.jpg",
    }
    with pytest.raises(ValidationError, match="must be a non-empty string"):
        validator_with_temp_csv.validate_submission(invalid_data)


def test_register_experience_persists_to_csv(validator_with_temp_csv):
    valid_data = {
        "experience_name": "New Delhi Art Gallery Crawl",
        "category": "Art & Culture",
        "sub_category": "Art Walk",
        "city": "Delhi",
        "price_inr": 400.0,
        "duration_hours": 2.5,
        "latitude": 28.6000,
        "longitude": 77.2200,
        "tags": "Art; Gallery; Painting",
        "best_for": "Art Lovers",
        "image_url": "https://images.unsplash.com/photo-1544717305-2782549b5136",
    }

    registered = validator_with_temp_csv.register_experience(valid_data)
    assert "experience_id" in registered
    assert registered["experience_id"].startswith("DEL-")
    assert registered["image_url"] == "https://images.unsplash.com/photo-1544717305-2782549b5136"

    # Verify written to CSV and image_url is preserved
    df = pd.read_csv(validator_with_temp_csv.dataset_path)
    assert len(df) == 2
    assert df.iloc[1]["experience_id"] == registered["experience_id"]
    assert df.iloc[1]["experience_name"] == "New Delhi Art Gallery Crawl"
    assert df.iloc[1]["image_url"] == "https://images.unsplash.com/photo-1544717305-2782549b5136"


def test_validator_rejects_quality_score_below_50(validator_with_temp_csv):
    low_quality_data = {
        "experience_name": "Low Quality Tour",
        "category": "Adventure",
        "city": "Delhi",
        "price_inr": 300.0,
        "duration_hours": 1.0,
        "latitude": 28.61,
        "longitude": 77.21,
        "image_url": "https://example.com/tour.jpg",
        "ai_quality_score": 42.0,  # Below minimum 50
    }
    with pytest.raises(ValidationError, match="AI quality check score .* is below 50"):
        validator_with_temp_csv.validate_submission(low_quality_data)

