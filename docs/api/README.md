# LocalLens API Documentation

The backend service is powered by FastAPI and provides a modular REST API structure.

## Active Health Check

- **Endpoint**: `GET /health`
- **Response**: `{"status": "ok"}`

## Interactive API Documentation

When the FastAPI server is running:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/api/v1/openapi.json`

## API Routing Structure

The backend routes are separated into modular packages under `backend/app/api/`:
- `traveler/` — Traveler profile, preferences, discovery
- `provider/` — Provider listing management, availability
- `rider/` — Rider dispatch and transport
- `experiences/` — Experience catalog and reviews
- `itinerary/` — Itinerary planning and optimization
- `rides/` — Ride coordination
- `recommendations/` — Contextual discovery feeds
- `notifications/` — Event alerts
