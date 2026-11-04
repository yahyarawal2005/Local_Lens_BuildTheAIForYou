"""
Weather Context and Trip Summary Schemas.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WeatherCurrentResponse(BaseModel):
    destination: Optional[str] = None
    coordinates: Dict[str, float]
    condition: str
    temperature_c: float
    temperature: str
    humidity_pct: int
    rainfall_mm: float
    wind_speed_kmh: str
    source: str
    is_simulated: bool = False


class DailyForecastItem(BaseModel):
    date: str
    condition: str
    temp_min_c: float
    temp_max_c: float
    average_temp_c: float
    precipitation_sum_mm: float
    rain_probability_pct: int
    wind_speed_kmh: float
    uv_index: Optional[float] = None
    forecast_available: bool = True
    suitability_score: float = 0.9
    suitability_reason: str = "Favorable conditions"


class WeatherForecastResponse(BaseModel):
    destination: str
    coordinates: Dict[str, float]
    status: str
    forecast_available: bool
    timezone: str = "Asia/Kolkata"
    source: str
    horizon_days: int = 16
    daily: List[DailyForecastItem] = Field(default_factory=list)
    warning: Optional[str] = None


class WeatherTripSummaryRequest(BaseModel):
    destination: str = Field(..., description="Destination name (e.g. 'Jaipur')")
    start_date: Optional[str] = Field(None, description="Trip start date (YYYY-MM-DD)")
    days: int = Field(3, ge=1, le=16, description="Trip duration in days")
    lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    lon: Optional[float] = Field(None, ge=-180.0, le=180.0)


class WeatherTripSummaryResponse(BaseModel):
    destination: str
    coordinates: Dict[str, float]
    start_date: str
    days_count: int
    overall_condition: str
    average_temp_c: float
    outdoor_suitability: str
    forecast_available: bool
    weather_advice: str
    daily_summaries: List[Dict[str, Any]] = Field(default_factory=list)
    source: str
