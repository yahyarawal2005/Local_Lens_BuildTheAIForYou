# LocalLens Database Architecture

The persistence layer uses PostgreSQL with PostGIS extensions to support location-aware operations and spatial indexing.

## Spatial Extensions

The base schema enables PostGIS via `database/schema.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Structure

```text
database/
├── migrations/
├── seeds/
├── schema.sql
└── README.md
```

## Docker Initialization

When running `docker compose up -d`, the database container automatically loads `database/schema.sql` into the initialized database.
