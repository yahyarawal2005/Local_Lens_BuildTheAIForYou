# LocalLens Architecture Overview

LocalLens is structured as a modular platform with clear boundaries between the mobile traveler client, web provider portal, backend API services, spatial data persistence, real-time caching, and machine learning pipelines.

## Architecture Diagram

```text
              ┌──────────────────┐
              │  Traveler App    │
              │ Flutter / Dart   │
              └────────┬─────────┘
                       │
                       ↓
                ┌──────────────┐
                │   FastAPI    │
                │   Backend    │
                └──────┬───────┘
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
   PostgreSQL       Redis          ML
    + PostGIS

                       ↑
                       │
              ┌────────┴─────────┐
              │  Provider Web    │
              │ Next.js / React  │
              └──────────────────┘
```

Future:

```text
              ┌──────────────────┐
              │    Rider App     │
              │ Flutter / Mobile │
              └────────┬─────────┘
                       │
                       ↓
                    FastAPI
```

## System Components & Communication Flows

### Traveler Application
- **Stack**: Flutter + Dart
- **Role**: Mobile application for discovery, itinerary viewing, and ride interactions.
- **Flow**:
  ```text
  Flutter Mobile App
  ↓
  FastAPI
  ↓
  PostgreSQL / PostGIS
  ```

### Provider Web Application
- **Stack**: Next.js + React + TypeScript + Tailwind CSS
- **Role**: Web portal for experience providers to manage listings, availability, and bookings.
- **Flow**:
  ```text
  Next.js Web App
  ↓
  FastAPI
  ↓
  PostgreSQL / PostGIS
  ```

### Rider Application (Future)
- **Stack**: Mobile Application
- **Role**: Dedicated client for transit riders/drivers to receive and manage ride requests.
- **Flow**:
  ```text
  Future Rider App
  ↓
  FastAPI
  ```

### Machine Learning Workspace
- **Stack**: Scikit-learn, XGBoost, Transformers, PyTorch, NumPy, Pandas
- **Role**: Offline model development and inference logic for recommendation scoring, itinerary synthesis, and experience quality analysis.
- **Flow**:
  ```text
  FastAPI
  ↓
  ML inference layer
  ↓
  ML models
  ```

### Real-Time & Caching
- **Stack**: Redis (+ future WebSockets)
- **Role**: Transient state caching, itinerary session cache, and event streaming broker.
- **Flow**:
  ```text
  FastAPI
  ↓
  Redis
  ↓
  real-time/caching features
  ```
