# LocalLens

LocalLens is an intelligent local discovery and experience platform that helps travelers discover relevant local experiences, generate personalized itineraries, manage rides, and adapt plans when real-world conditions change.

---

## Tech Stack

- **Traveler**: Next.js + React + TypeScript + Tailwind CSS (PWA)
- **Provider**: Next.js + React + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python
- **Database**: PostgreSQL + PostGIS
- **ML**: Scikit-learn + XGBoost + Transformers + PyTorch
- **Realtime**: Redis + future WebSockets
- **Infrastructure**: Docker

---

## Architecture

```text
              ┌──────────────────┐
              │  Traveler Web    │
              │ Next.js / PWA    │
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

---

## Project Structure

```text
LocalLens/
│
├── traveler-web/     # Next.js 15 PWA for travelers (replaces traveler-app Flutter)
├── provider-web/     # Next.js web application for experience providers
├── backend/          # FastAPI backend services, schemas, and repositories
├── ml/               # Python machine learning workspace and pipelines
├── database/         # PostgreSQL + PostGIS schema, migrations, and seeds
├── rider-app/        # Future separate mobile application for riders
├── docs/             # Architecture, API, database, and development guides
│
├── .gitignore        # Root gitignore rules
├── .env.example      # Root environment template
├── docker-compose.yml# Container orchestration (PostgreSQL + PostGIS, Redis)
├── README.md         # Monorepo overview and developer instructions
└── LICENSE           # Repository license
```

### Directory Overview

- **`traveler-web/`**: Next.js 15 progressive web application (PWA) for travelers — itinerary generation, local discovery, and ride booking across all platforms.
- **`provider-web/`**: Next.js (App Router) TypeScript web application for local experience providers to manage listings, bookings, sponsorships, and analytics.
- **`backend/`**: Asynchronous Python backend powered by FastAPI with layered architecture (`api` → `services` → `repositories` → `models`).
- **`ml/`**: Machine learning workspace for recommendation scoring, itinerary synthesis, and experience quality analysis.
- **`database/`**: Database initialization scripts, spatial extension setup (PostGIS), and migration assets.
- **`rider-app/`**: Workspace placeholder for the future dedicated rider mobile application.
- **`docs/`**: Comprehensive architectural, API, database, and developer onboarding documentation.

---

## Local Development

### 1. Start Infrastructure (PostgreSQL + PostGIS & Redis)

```bash
docker compose up -d
```

Verify service status:

```bash
docker compose ps
```

### 2. Traveler Web Application (Next.js)

```bash
cd traveler-web
npm install
npm run dev   # runs on port 3001
```

### 3. Provider Web Application (Next.js)

```bash
cd provider-web
npm install
npm run dev
```

### 4. Backend Application (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate on Windows:
venv\Scripts\activate
# Activate on macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI dev server
uvicorn app.main:app --reload


cd d:\BuildForU\Local_Lens-main\backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

Health check verification:
```bash
curl http://localhost:8000/health
```

### 5. Machine Learning Workspace

```bash
cd ml

# Create virtual environment
python -m venv venv

# Activate on Windows:
venv\Scripts\activate
# Activate on macOS/Linux:
# source venv/bin/activate

# Install ML dependencies
pip install -r requirements.txt
```

---

## Git Branching & Workflow

To maintain clean modular boundaries and enable parallel developer workflows, branch off `main` according to domain scope:

- `feature/traveler` — Traveler Next.js web application (PWA)
- `feature/provider` — Provider Next.js web application
- `feature/rider` — Future rider mobile application
- `feature/backend` — Backend services, repositories, and API routes
- `feature/recommendation` — ML recommendation engine
- `feature/itinerary` — ML itinerary engine
- `feature/database` — Database schemas and migrations
