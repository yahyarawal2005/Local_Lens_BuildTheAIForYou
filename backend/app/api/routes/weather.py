"""
Weather Engine API Endpoints (V1).
Provides current conditions, forecast horizon, and trip summaries.
"""
from typing import Optional
from fastapi import APIRouter, Body, HTTPException, Query, status
from backend.app.schemas.weather_schemas import (
    WeatherCurrentResponse,
    WeatherForecastResponse,
    WeatherTripSummaryRequest,
    WeatherTripSummaryResponse,
)
from backend.app.services.weather_service import WeatherService

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("/current", response_model=WeatherCurrentResponse)
async def get_current_weather(
    destination: Optional[str] = Query(None, description="Destination name (e.g. 'Jaipur')"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    lon: Optional[float] = Query(None, ge=-180.0, le=180.0),
):
    """
    Retrieve live meteorological conditions for destination coordinates.
    """
    res = await WeatherService.get_weather_forecast(
        lat=lat,
        lon=lon,
        destination=destination,
    )
    if res.get("status") == "unavailable" or res.get("latitude") is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to resolve geographic coordinates for destination '{destination}'.",
        )
    return WeatherCurrentResponse(
        destination=destination or res.get("city_name"),
        coordinates={"lat": float(res["latitude"]), "lng": float(res["longitude"])},
        condition=res.get("condition", "Clear Sky"),
        temperature_c=float(res.get("temperature_c", 28.0)),
        temperature=str(res.get("temperature", "28°C")),
        humidity_pct=int(res.get("humidity_pct", 55)),
        rainfall_mm=float(res.get("rainfall_mm", 0.0)),
        wind_speed_kmh=str(res.get("wind_speed_kmh", "10 km/h")),
        source=str(res.get("source", "open-meteo")),
        is_simulated=bool(res.get("is_simulated", False)),
    )


@router.get("/forecast", response_model=WeatherForecastResponse)
async def get_weather_forecast(
    destination: Optional[str] = Query(None, description="Destination name (e.g. 'Jaipur')"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    lon: Optional[float] = Query(None, ge=-180.0, le=180.0),
    days: int = Query(7, ge=1, le=16),
):
    """
    Retrieve daily weather forecast series (up to 16 days) with suitability scores.
    """
    series = await WeatherService.get_forecast_series(
        lat=lat,
        lon=lon,
        destination=destination,
        days=days,
    )
    if series.get("status") == "unavailable" or series.get("coordinates", {}).get("lat") == 0.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to resolve geographic coordinates for destination '{destination}'.",
        )
    return WeatherForecastResponse(**series)


@router.get("/trip-summary", response_model=WeatherTripSummaryResponse)
async def get_weather_trip_summary_query(
    destination: str = Query(..., description="Destination name (e.g. 'Jaipur')"),
    start_date: Optional[str] = Query(None, description="Trip start date (YYYY-MM-DD)"),
    days: int = Query(3, ge=1, le=16),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    lon: Optional[float] = Query(None, ge=-180.0, le=180.0),
):
    """
    Get consolidated weather summary and recommendations guidance for a specific trip duration via GET query.
    """
    summary = await WeatherService.get_trip_summary(
        destination=destination,
        start_date=start_date,
        days=days,
        lat=lat,
        lon=lon,
    )
    return WeatherTripSummaryResponse(**summary)


@router.post("/trip-summary", response_model=WeatherTripSummaryResponse)
async def get_weather_trip_summary_post(
    payload: WeatherTripSummaryRequest = Body(...),
):
    """
    Get consolidated weather summary and recommendations guidance for a specific trip duration via POST body.
    """
    summary = await WeatherService.get_trip_summary(
        destination=payload.destination,
        start_date=payload.start_date,
        days=payload.days,
        lat=payload.lat,
        lon=payload.lon,
    )
    return WeatherTripSummaryResponse(**summary)
