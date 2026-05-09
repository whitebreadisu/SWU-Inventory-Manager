# SWU Inventory Manager

Personal card inventory management for the Star Wars Unlimited collectible trading card game. Replaces an Excel-based workflow with a low-friction web application.

## Prerequisites

The following tools must already be installed:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2)
- [VS Code](https://code.visualstudio.com/)
- [Git](https://git-scm.com/)

## Local Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd swu-inventory-manager
```

### 2. Create your environment file

```bash
copy .env.example .env
```

The defaults in `.env.example` work for local development without modification.

### 3. Start all services

```bash
docker compose up --build
```

This builds and starts three services:

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Database |
| FastAPI backend | 8000 | REST API |
| React frontend | 5173 | Dev server |

First run takes a few minutes while Docker pulls images and installs dependencies. Subsequent starts are fast.

### 4. Verify the setup

| URL | What you should see |
|-----|---------------------|
| http://localhost:5173 | React app |
| http://localhost:8000/docs | Swagger UI (interactive API docs) |
| http://localhost:8000/redoc | ReDoc (API reference) |
| http://localhost:8000/health | `{"status": "ok"}` |

### 5. Stop services

```bash
docker compose down
```

To also wipe the database (full reset):

```bash
docker compose down -v
```

## Development workflow

**Backend hot reload** — FastAPI runs with `--reload`. Save any `.py` file and the server restarts automatically.

**Frontend hot reload** — Vite watches `frontend/src/`. Changes appear in the browser instantly.

### Run backend tests

```bash
docker compose exec backend pytest
```

### Run frontend tests

```bash
docker compose exec frontend npm test
```

## Project structure

```
.
├── backend/
│   ├── app/
│   │   ├── ingestion/      # CSV and Excel import pipeline
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── repositories/   # Database query logic
│   │   ├── services/       # Business logic
│   │   ├── routers/        # FastAPI route handlers
│   │   ├── tests/          # pytest test suite
│   │   └── main.py         # Application entry point
│   ├── Dockerfile
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── test/           # Vitest setup
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── .env.example            # Commit this — no secrets
├── .env                    # Never commit — in .gitignore
└── README.md
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `swu_inventory` | Database name |
| `POSTGRES_USER` | `swu_user` | Database user |
| `POSTGRES_PASSWORD` | `changeme` | Database password |
| `POSTGRES_PORT` | `5432` | Host-side port for PostgreSQL |
| `DATABASE_URL` | *(derived)* | Full connection string — set by docker-compose.yml |
