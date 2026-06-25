# SWU Inventory Manager

Personal card inventory management for the Star Wars Unlimited collectible trading card game. Replaces an Excel-based workflow with a low-friction web application.

**Live app:** [swu.jeremybradenapps.com](https://swu.jeremybradenapps.com)

## Architecture

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | React + Vite | Firebase Hosting (prod); Vite dev server (local) |
| Backend | FastAPI (Python) | Cloud Run (prod); Docker (local) |
| Database | PostgreSQL 16 | Cloud SQL (prod); Docker (local) |
| Auth | Firebase Authentication | Bearer token required on all `/api/*` routes |
| Infrastructure | GCP + Terraform | Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, Cloud DNS |
| CI/CD | GitHub Actions | test → build/push → deploy on every push to `main` |

**Multi-tenancy:** every Firebase user gets their own isolated inventory, auto-provisioned on first login via Postgres Row-Level Security. See `specification_documents/SWU_Platform_Spec.md` Section 1 for the auth/tenancy architecture.

**Note on API docs:** Swagger UI (`/docs`) and ReDoc (`/redoc`) are disabled in production (`ENVIRONMENT=production`) and available only in local development.

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

This builds and starts four services:

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Database |
| FastAPI backend | 8000 | REST API |
| React frontend | 5173 | Dev server |
| Firebase Auth Emulator | 9099 | Local auth (no real Firebase credentials needed) |

The Firebase Auth Emulator runs against the reserved offline project id `demo-swu` — no GCP account or login required locally. The backend detects `FIREBASE_AUTH_EMULATOR_HOST` and skips real token signature verification automatically.

First run takes a few minutes while Docker pulls images and installs dependencies. Subsequent starts are fast.

On every startup the backend automatically runs database migrations, applies the card catalog seed file (`db/seeds/catalog_seed.sql`), and applies the inventory snapshot (`db/snapshots/inventory_snapshot.sql`). Both applies are idempotent — they skip if their table is already populated.

### 4. Verify the setup

| URL | What you should see |
|-----|---------------------|
| http://localhost:5173 | React app (sign in via the auth emulator) |
| http://localhost:8000/docs | Swagger UI (interactive API docs — local only) |
| http://localhost:8000/redoc | ReDoc (API reference — local only) |
| http://localhost:8000/health | `{"status": "ok"}` |

### 5. Stop services

```bash
docker compose down
```

To also wipe the database (full reset):

```bash
docker compose down -v
```

After a full reset, `docker compose up` automatically restores both the card catalog and personal inventory from the seed and snapshot files — no manual steps required.

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
│   │   ├── ingestion/      # Seed and snapshot import pipeline
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── repositories/   # Database query logic
│   │   ├── routers/        # FastAPI route handlers
│   │   ├── tests/          # pytest test suite
│   │   ├── auth.py         # Firebase token verification
│   │   ├── database.py     # get_db() — auth + RLS tenant-context wiring
│   │   ├── middleware.py   # Structured request logging
│   │   └── main.py         # Application entry point
│   ├── Dockerfile
│   └── requirements.txt
├── db/
│   ├── seeds/
│   │   └── catalog_seed.sql        # Card catalog seed (auto-applied on startup)
│   └── snapshots/
│       └── inventory_snapshot.sql  # Personal inventory snapshot (auto-applied on startup)
├── frontend/
│   ├── src/
│   │   ├── api/            # authedFetch (attaches Firebase Bearer token)
│   │   ├── screens/        # Auth, Catalog, Inventory UI screens
│   │   └── components/     # FilterPanel, AddCardsModal, etc.
│   ├── firebase.json       # Hosting rewrites (/api/** → Cloud Run)
│   ├── package.json
│   └── vite.config.ts
├── terraform/
│   └── environments/
│       ├── prod/           # swu-prod: Cloud Run, Cloud SQL, Firebase, Monitoring
│       └── sandbox/        # swu-sandbox: P1 bootstrap only (ephemeral exploration)
├── specification_documents/  # See Documentation Map below
├── learning_guide/           # Teaching companion (Key Concepts, decision comparisons)
├── learning_journal/         # Session-by-session development notes
├── claude_design/            # UI design assets and component handoff files
├── docker-compose.yml
├── .env.example              # Commit this — no secrets
└── .env                      # Never commit — in .gitignore
```

## Environment variables

Local development uses `.env` (copied from `.env.example`). Production values are stored in GCP Secret Manager and injected into Cloud Run at runtime — never committed.

| Variable | Local default | Description |
|----------|--------------|-------------|
| `POSTGRES_DB` | `swu_inventory` | Database name |
| `POSTGRES_USER` | `swu_user` | Admin/migration role |
| `POSTGRES_PASSWORD` | `changeme` | Admin role password |
| `POSTGRES_PORT` | `5432` | Host-side port for PostgreSQL |
| `APP_DB_PASSWORD` | `changeme_app` | Password for `swu_app` (RLS-aware role, created by migration 0019) |
| `DATABASE_URL` | *(derived)* | Admin DSN used by Alembic and ingestion scripts |
| `APP_DATABASE_URL` | *(derived)* | App DSN used by `get_db()` — RLS enforced on this connection |
| `ENVIRONMENT` | *(unset)* | Set to `"production"` on Cloud Run; disables `/docs`/`/redoc` |

## Documentation Map

The authoritative source for each domain — start here to find "where does X live?". Each fact has one home; everything else points to it.

| Document | Authoritative for |
|----------|-------------------|
| `specification_documents/SWU_Application_Spec.md` | **The application** — catalog/variant/inventory data model, variant model, and UX (as-built). *API/ingestion/architecture sections being absorbed — BL-49.* |
| `specification_documents/SWU_Standard_Variant_Mapping_Spec.md` | Variant **mechanism** (`variant_of_uuid` resolution); current exceptions in `swuapi_standard_variant_exceptions.md` |
| `specification_documents/CARD_RULES.md` | Card catalog domain rules (enforced by `backend/app/tests/test_card_domain_rules.py`) |
| `specification_documents/SWU_Platform_Spec.md` | **Platform** — auth/tenancy, CI/CD, Terraform, observability, security (as-built) |
| `specification_documents/SWU_Platform_Roadmap.md` | Platform phase history (P1-P7) — *when and why* each platform decision was made |
| `specification_documents/SWU_Platform_Security_Review.md` | Full OWASP Top 10 + secrets/network walkthrough |
| `specification_documents/SWU_Backlog.md` | **All outstanding work** — the single registry; everything else points to a BL-ID |
| `docs/decisions/` | **Architecture Decision Records** — why the key architectural decisions were made |
| `specification_documents/analysis/` | Supporting analyses & evidence (variant census, test-disposition logs) |
| `specification_documents/SWU_ClaudeCode_Spec.md` | *Frozen* — original V1 design spec (historical; superseded by the Application Spec) |
| `learning_guide/`, `learning_journal/`, `claude_design/` | Personal teaching notes, session journal, and design assets (gitignored — not in the repo) |
