# LocalLens Database Management

The database layer runs on **PostgreSQL** with the **PostGIS** spatial extension for geo-indexing, proximity search, and geospatial routing calculations.

## Directory Structure

```text
database/
├── migrations/       # Schema versioning scripts (Alembic / SQL migrations)
├── seeds/            # Initial baseline data and fixtures (environments/testing)
├── schema.sql        # Baseline initialization script and PostGIS extension loader
└── README.md
```

## Conceptual Schema Entities

The platform manages the following core domains:

1. **User & Identity Domains**:
   - `users`: Core authentication, email, password hash, role (`traveler`, `provider`, `rider`, `admin`)
   - `travelers`: Traveler profile, preferences, budget tier, travel style
   - `providers`: Experience host profile, verification status, payout details
   - `riders`: Driver profile, vehicle info, current status, live GPS point

2. **Catalog & Experience Domains**:
   - `locations`: Normalized coordinates (`GEOMETRY(Point, 4326)`), addresses, polygons, cities
   - `experiences`: Local tours, workshops, culinary tastings, activities
   - `experience_availability`: Time slots, capacity limits, recurrence rules
   - `experience_reviews`: Rating, commentary, photo references, sentiment score

3. **Itinerary & Booking Domains**:
   - `itineraries`: Generated day/multi-day plans, constraints, total estimated cost/time
   - `itinerary_items`: Sequenced experience stops, allocated duration, transit buffers
   - `bookings`: Reservations, payment states, confirmation codes
   - `ride_bookings`: Dispatch requests, origin/destination coordinates, ride status

4. **Dynamic Context & Operations**:
   - `sponsored_campaigns`: Featured provider campaigns, impression budgets, targets
   - `weather_events`: Ingested forecast alerts and active climate conditions
   - `traffic_events`: Real-time road delays and transit bottlenecks
   - `notifications`: Push and in-app alerts sent to users/riders

## Starting the Database

PostgreSQL + PostGIS can be started locally via Docker Compose from the project root:

```bash
docker compose up -d postgres
```
