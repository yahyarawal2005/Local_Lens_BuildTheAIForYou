# LocalLens Backend API

The backend service for LocalLens is built with **FastAPI**, **SQLAlchemy**, **PostgreSQL + PostGIS**, and **Redis**.

## Architecture Pattern

The backend follows a layered architecture to keep code modular and decoupled:

```text
API Route (FastAPI routers in app/api/*)
    ↓
Service Layer (Business logic & external services in app/services/*)
    ↓
Repository Layer (Database queries & abstractions in app/repositories/*)
    ↓
Database Models (SQLAlchemy entities in app/models/*)
```

## Directory Structure

```text
backend/
├── app/
│   ├── main.py              # Application entrypoint & healthcheck
│   ├── core/                # App configuration, security, DB engine
│   ├── models/              # SQLAlchemy database models
│   ├── schemas/             # Pydantic request/response schemas
│   ├── api/                 # API routers organized by domain
│   │   ├── traveler/
│   │   ├── provider/
│   │   ├── rider/
│   │   ├── experiences/
│   │   ├── itinerary/
│   │   ├── rides/
│   │   ├── recommendations/
│   │   └── notifications/
│   ├── services/            # Business logic handlers
│   ├── repositories/        # Database access layer
│   └── utils/               # Shared helpers and utilities
├── tests/                   # Automated pytest suite
├── requirements.txt         # Python dependencies
├── .env.example             # Environment template
├── Dockerfile               # Production container image definition
└── README.md
```

## Setup & Running

### 1. Create Virtual Environment
```bash
python -m venv venv
```

**Activate (Windows):**
```powershell
venv\Scripts\activate
```

**Activate (macOS/Linux):**
```bash
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run Development Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Health Check
```bash
curl http://localhost:8000/health
```
Expected response:
```json
{
  "status": "ok"
}
```

Interactive OpenAPI docs: `http://localhost:8000/docs`
