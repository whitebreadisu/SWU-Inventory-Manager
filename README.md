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

On every startup the backend automatically runs database migrations and applies the card catalog seed file (`db/seeds/catalog_seed.sql`). The catalog (all sets and card variants) is populated without any manual steps.

### 4. Load personal inventory (first run only)

The card catalog is seeded automatically, but personal inventory must be loaded from the source Excel file on a fresh database:

```bash
docker compose exec backend python -m app.ingestion.run_inventory_ingestion
```

This reads `personal_card_inventory/SWU Collection Tracker MASTER v2.1.xlsx` and populates the inventory table. Run this once after initial setup. It is safe to re-run on a fresh database — it skips records that already exist.

> Once the application UI is in use, inventory is managed exclusively through the app. Do not re-run this command against a database that already has UI-managed inventory, as it will not overwrite existing records.

### 5. Verify the setup

| URL | What you should see |
|-----|---------------------|
| http://localhost:5173 | React app |
| http://localhost:8000/docs | Swagger UI (interactive API docs) |
| http://localhost:8000/redoc | ReDoc (API reference) |
| http://localhost:8000/health | `{"status": "ok"}` |

### 6. Stop services

```bash
docker compose down
```

To also wipe the database (full reset):

```bash
docker compose down -v
```

After a full reset, `docker compose up` automatically restores the card catalog from the seed file. Re-run the inventory ingestion command from step 4 to restore personal inventory.

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
│   ├── alembic/            # Database schema migrations
│   ├── app/
│   │   ├── ingestion/      # CSV, Excel, seed import pipeline
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── repositories/   # Database query logic
│   │   ├── services/       # Business logic
│   │   ├── routers/        # FastAPI route handlers
│   │   ├── tests/          # pytest test suite
│   │   └── main.py         # Application entry point
│   ├── Dockerfile
│   ├── pytest.ini
│   └── requirements.txt
├── db/
│   └── seeds/
│       └── catalog_seed.sql  # Card catalog seed (auto-applied on startup)
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
