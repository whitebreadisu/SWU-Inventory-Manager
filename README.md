# SWU Inventory Manager

Personal card inventory management for the Star Wars Unlimited collectible trading card game. Replaces an Excel-based workflow with a low-friction web application.

**Live app:** [swu.jeremybradenapps.com](https://swu.jeremybradenapps.com)

## Architecture

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | React + Vite | Firebase Hosting (prod + dev); Vite dev server (local) |
| Backend | FastAPI (Python) | Cloud Run (prod + dev); Docker (local) |
| Database | PostgreSQL 16 | Cloud SQL (prod + dev); Docker (local) |
| Auth | Firebase Authentication | Bearer token required on all `/api/*` routes; each user gets an isolated inventory via Postgres Row-Level Security |
| Infrastructure | GCP + Terraform | Shared `modules/app` called by each environment; Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, Cloud DNS |
| CI/CD | GitHub Actions | Build-once / promote: tests → single image build → auto-deploy to `swu-dev` → gated prod release (`risk:low` changes auto-promote; everything else requires human approval) |

**Multi-tenancy:** every Firebase user gets their own isolated inventory, auto-provisioned on first login via Postgres Row-Level Security. See `specification_documents/SWU_Platform_Spec.md` Section 1 for the auth/tenancy architecture.

**Note on API docs:** Swagger UI (`/docs`) and ReDoc (`/redoc`) are disabled in production (`ENVIRONMENT=production`) and available only in local development.

---

## Environments

| Environment | URL | Purpose |
|------------|-----|---------|
| **Production** | [swu.jeremybradenapps.com](https://swu.jeremybradenapps.com) | Live app. Every merge to `main` deploys here — gated by human approval, or auto-promoted for `risk:low` changes. |
| **Dev** | [swu-dev-jbapps.web.app](https://swu-dev-jbapps.web.app) | Staging environment. Every merge auto-deploys here first; validates before prod. Full prod-fidelity (real Cloud SQL, real Firebase Auth, same Docker image). |
| **Local** | `localhost:5173` | Docker Compose + Firebase Auth Emulator. No GCP credentials needed. |

---

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

On every startup the backend automatically runs database migrations and, if the catalog is empty, **bootstraps the card catalog from the committed swuapi export** (`backend/app/ingestion/data/swuapi_export_2026-06-21.json`) via the ingestion pipeline. It then applies the personal inventory snapshot (`db/snapshots/inventory_snapshot.sql`) if one is present. Both steps are idempotent — they skip when their table is already populated. (See `docs/decisions/0004-catalog-bootstrap-from-swuapi-export.md`.)

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

After a full reset, `docker compose up` automatically rebuilds the card catalog from the committed swuapi export — no manual steps required. (Personal inventory is restored only if a snapshot file is present.)

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
│   │   ├── ingestion/      # swuapi catalog ingestion + startup bootstrap
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
│   └── snapshots/          # Personal inventory snapshot (applied on startup if present)
├── frontend/
│   ├── src/
│   │   ├── api/            # authedFetch (attaches Firebase Bearer token)
│   │   ├── screens/        # Auth, Catalog, Inventory UI screens
│   │   └── components/     # FilterPanel, AddCardsModal, etc.
│   ├── firebase.json       # Hosting rewrites (/api/** → Cloud Run)
│   ├── package.json
│   └── vite.config.ts
├── terraform/
│   ├── modules/
│   │   └── app/            # Shared module: Cloud Run, Cloud SQL, Firebase, Monitoring
│   └── environments/
│       ├── prod/           # swu-prod — calls modules/app; state in swu-prod-tfstate
│       ├── dev/            # swu-dev-jbapps — same module, isolated environment
│       └── sandbox/        # swu-sandbox — bootstrap only (ephemeral exploration)
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
| `specification_documents/SWU_Platform_Roadmap.md` | Platform phase history (P1-P7) + **§7 Agentic Platform Evolution** — the autonomy roadmap and governing principles |
| `specification_documents/SWU_Platform_Security_Review.md` | Full OWASP Top 10 + secrets/network walkthrough |
| `specification_documents/SWU_Backlog.md` | **All outstanding work** — the single registry; everything else points to a BL-ID |
| `docs/decisions/` | **Architecture Decision Records** — why the key architectural decisions were made |
| `specification_documents/analysis/` | Supporting analyses & evidence (variant census, test-disposition logs) |
| `specification_documents/SWU_ClaudeCode_Spec.md` | *Frozen* — original V1 design spec (historical; superseded by the Application Spec) |
| `learning_guide/`, `learning_journal/`, `claude_design/` | Personal teaching notes, session journal, and design assets (gitignored — not in the repo) |

---

## Agentic Development Workflow

This project actively experiments with AI-agent-driven engineering — not as a prototype, but as the primary development model. The platform was designed to make agent autonomy safe, measurable, and incrementally expandable.

### Pattern

**Opus orchestrates, Sonnet builds.** A Claude Opus session sets direction, spawns Claude Sonnet implementation agents for well-scoped tasks, reviews their output for safety and quality, and assembles approval-ready evidence. The human approves gates; agents execute.

### Autonomy tiers (current state)

| Stage | Status | What it means in practice |
|-------|--------|--------------------------|
| 0 — Supervised-to-PR | ✅ Complete | Agents build to an open PR; human reviews and merges |
| 1 — Dev environment | ✅ Complete | Agents deploy to `swu-dev` and verify on a live URL before prod |
| 2 — Build-once + promote | ✅ Complete | One image per merge; auto-deploys to dev; prod behind a required-reviewer gate |
| 3 — Risk-tiered gating | ✅ Live | `risk:low` changes (CSS, copy, logic fixes with test coverage) auto-promote; high-blast-radius changes (auth, migrations, infra) keep the human gate |
| 4 — Automated prod-fidelity | Planned | Canary or staging with automated rollback replaces the human gate on routine changes |
| 5 — Autonomous within policy | Aspirational | Human sets policy and monitors; agent ships within it |

### How the gate works

PRs labeled `risk:low` take the `promote-prod-fast` CI path — no human approval required. Everything else goes through `promote-prod` with a required reviewer in the GitHub `production` Environment. The gate decouples agent scope from prod risk: more agent autonomy does not mean more prod risk, because the gate and the `risk:low` criteria tune independently.

### Governing principle

**Spec quality is the autonomy ceiling.** An agent operates autonomously only as far as the Definition of Done is crisp and machine-verifiable. The human's role shifts from approving each change to writing better specs, setting policy, and handling judgment calls.

### Validated by real runs

The dev environment's first clean apply (Phase 3) caught two latent bugs that prod never hit — exactly its purpose. The prod gate (Phase 7) caught a set-ordering bug before it reached users. Stage 3's first real test: four `risk:low` PRs (Decks tab removal, Add Cards copy cleanup, filter layout fix, token resolver bug) merged and auto-promoted to prod without human approval within a single session.

See `specification_documents/SWU_Platform_Roadmap.md §7` for the full roadmap, governing laws, and the complete 6-stage autonomy progression.
