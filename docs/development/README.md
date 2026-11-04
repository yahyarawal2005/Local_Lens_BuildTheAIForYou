# LocalLens Development Guide

Step-by-step instructions for local development across all modules in the LocalLens monorepo.

## 1. Prerequisites

- **Docker Desktop** (or Docker Compose v2)
- **Flutter SDK** (>= 3.13.4)
- **Node.js** (v20+ or v24+) & **npm**
- **Python** (v3.10+ / v3.11+ / v3.13+)

---

## 2. Infrastructure Services (Docker)

Start the PostgreSQL + PostGIS database and Redis cache:

```bash
docker compose up -d
```

Verify running services:

```bash
docker compose ps
```

---

## 3. Traveler Application (Flutter)

```bash
cd traveler-app
flutter pub get
flutter run
```

---

## 4. Provider Web Application (Next.js)

```bash
cd provider-web
npm install
npm run dev
```

The provider web portal will be accessible at `http://localhost:3000`.

---

## 5. Backend Service (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --reload
```

Verify backend health check:

```bash
curl http://localhost:8000/health
```

Expected response: `{"status": "ok"}`

---

## 6. Machine Learning Workspace

```bash
cd ml

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate

# Install ML dependencies
pip install -r requirements.txt
```

---

## 7. Git Branching & Workflow

To prevent conflicts across domains, work on dedicated feature branches:

- `feature/traveler` (Flutter Mobile App)
- `feature/provider` (Provider Web App)
- `feature/rider` (Rider Mobile App)
- `feature/backend` (FastAPI Services & Repositories)
- `feature/recommendation` (ML Recommendation Engine)
- `feature/itinerary` (ML Itinerary Engine)
- `feature/database` (PostGIS Database Schemas & Migrations)
