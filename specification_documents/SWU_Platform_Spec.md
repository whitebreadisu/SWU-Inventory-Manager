# SWU Platform Spec — As-Built Platform Reference

**Version 1.0 | Created 2026-06-14**

---

## Purpose & How to Use This Document

`SWU_ClaudeCode_Spec.md` is the application spec: data model, API, frontend UI. It explicitly put cloud hosting, CI/CD, and multi-tenancy out of scope for V1.

This document is its platform-side peer. It describes **how the deployed system actually works today** — authentication and multi-tenancy, the CI/CD pipeline, the Terraform-managed GCP infrastructure, observability, and the current security posture — with file/line references precise enough that a reviewer (human or AI) can verify each claim against the code without re-deriving it.

**Relationship to other documents:**

| Document | Role |
|---|---|
| `SWU_ClaudeCode_Spec.md` | Application spec — data model, API, frontend UI (V1) |
| **`SWU_Platform_Spec.md`** (this document) | As-built platform reference — auth/tenancy, CI/CD, infrastructure, observability, security |
| `SWU_Platform_Roadmap.md` | Phase-by-phase history and status tracker (P1-P7). Slimmed per `SWU_Backlog.md` BL-2 once this document existed — read it for *when and why* a decision was made; read this document for *how it works now*. |
| `SWU_Platform_Security_Review.md` | Full OWASP Top 10 + secrets/network walkthrough (P7 Stage 4). Section 5 below is a condensed summary that cross-references it. |
| `learning_guide/SWU_Learning_Guide.md` | Teaching-oriented companion — deeper "why," external resources, concept explanations. This document is the terse reference; the learning guide is the narrative. |
| `SWU_Backlog.md` | Open tech-debt/follow-up items, including several referenced from this document (BL-8, BL-9). |

**Design Rationale sections.** Several sections below include an inline "Design Rationale" subsection — a condensed decision record (selected option, alternatives considered, what tipped it) for choices that shaped the as-built system. These were migrated from `SWU_Platform_Roadmap.md`'s "Open Decisions" log and `SWU_Learning_Guide.md`'s "Selection & Comparison" sections (per `SWU_Backlog.md` Open Question B, resolved 2026-06-14 as "inline, not a separate ADR folder"). The roadmap/learning guide retain the full narrative treatment for anyone who wants the teaching version; these are the condensed, durable record.

---

## 1. Auth & Tenancy Architecture

### 1.1 Overview

Every `/api/*` route requires `Authorization: Bearer <Firebase ID token>`. A single FastAPI dependency, `get_db`, both verifies that token and establishes the caller's tenant context for PostgreSQL Row-Level Security (RLS) — every router gets both for free by declaring `Depends(get_db)`.

```
Request ──► Depends(get_db)                         [app/database.py:22]
              │
              ├──► Depends(get_current_identity)    [app/auth.py:39]  (resolved first, transitively)
              │       └──► verify_firebase_token(Authorization header)
              │               └──► firebase_admin.auth.verify_id_token(...)
              │       returns (firebase_uid, email)
              │
              ├──► set_config('app.current_firebase_uid', firebase_uid, false)
              ├──► look up / auto-provision users → tenants  (RLS: user_self_access)
              ├──► set_config('app.current_tenant_id', tenant_id, false)
              ├──► request.state.tenant_id = tenant_id   (consumed by logging middleware)
              └──► yield db   (swu_app session; RLS: tenant_isolation enforces inventory scoping)
```

### 1.2 Where the token is verified — `app/auth.py`

- `_get_firebase_app()` (`app/auth.py:10-18`) — lazily initializes the Firebase Admin SDK via `credentials.ApplicationDefault()`. On Cloud Run this resolves to the `backend-runtime` service account's identity automatically — no Secret Manager entry needed for this step.
- `verify_firebase_token(authorization)` (`app/auth.py:21-36`) — requires `Authorization: Bearer <token>`; calls `auth.verify_id_token(token, app=...)`, which validates signature (against Google's rotating public keys), expiry, issuer, and audience. Raises `HTTPException(401)` on any failure (missing header, wrong scheme, invalid/expired token). Returns `(firebase_uid, email)`.
- `get_current_identity(authorization: Optional[str] = Header(default=None))` (`app/auth.py:39-45`) — the FastAPI dependency itself. Tests override this via `app.dependency_overrides`, so the real Firebase Admin app is never initialized outside a deployment.

### 1.3 The `Depends` chain — how every route gets auth "for free"

This is the mechanism that an external review (ChatGPT, 2026-06-14) misread as missing. `app/database.py:22-25`:

```python
def get_db(
    request: Request,
    identity: tuple[str, str] = Depends(get_current_identity),
):
```

`identity`'s default value is itself `Depends(get_current_identity)`. FastAPI's dependency resolution is **transitive**: when a router declares `Depends(get_db)`, FastAPI inspects `get_db`'s own signature, finds the nested `Depends(get_current_identity)`, and resolves it *first* — before `get_db`'s body runs at all. The router function never mentions `get_current_identity`; it doesn't need to.

Confirmed by grep across `app/routers/{cards,inventory,sets}.py`: 7 occurrences of `Depends(get_db)`, 0 separate auth dependency declared anywhere at the router level. Every one of those 7 endpoints verifies the bearer token before its body executes.

**For a future reviewer:** if you're checking "is auth actually enforced on route X," the check is "does X declare `Depends(get_db)`?" — not "does X (or its router) mention auth/identity anywhere." The auth check is a side effect of acquiring a database session, by design (Section 1.6 explains why a *second*, RLS-scoped session is the right place for it).

### 1.4 `get_db` step by step — `app/database.py:22-89`

1. FastAPI resolves `identity = get_current_identity(...)` → `(firebase_uid, email)`. If this raises `401`, `get_db`'s body never runs.
2. Opens a session on `AppSessionLocal` (bound to `APP_DATABASE_URL`, the `swu_app` role — see 1.6).
3. `SELECT set_config('app.current_firebase_uid', :uid, false)` — session-scoped (third argument `false`; see Design Rationale 1.7.1).
4. `SELECT tenant_id FROM users WHERE firebase_uid = :uid` — the `users.user_self_access` RLS policy (migration 0021) means this query can only ever see the caller's own row, or zero rows.
5. **If no row** (first-ever request from this `firebase_uid`) — auto-provisioning:
   - `INSERT INTO tenants (name) VALUES (:email's Tenant) RETURNING id` → `new_tenant_id`
   - `INSERT INTO users (firebase_uid, tenant_id, email) VALUES (...) ON CONFLICT (firebase_uid) DO NOTHING RETURNING tenant_id`
   - If that insert returned a row, use its `tenant_id`. If not (lost a race with a concurrent first request for the same `firebase_uid`), `new_tenant_id` is now an orphaned `tenants` row, and the code re-selects the winning request's `tenant_id` from `users`.
   - `db.commit()`.
6. **If a row exists** — `tenant_id = row.tenant_id`.
7. `SELECT set_config('app.current_tenant_id', :tenant_id, false)` — session-scoped (Design Rationale 1.7.1).
8. `request.state.tenant_id = tenant_id` — read by the P6 logging middleware (`app/middleware.py`, Section 4.1) so every structured log line for this request carries the tenant.
9. `yield db` — the router's body runs here with a `swu_app` session that already has both session variables set. `finally: db.close()`.

### 1.5 Row-Level Security policies

| Migration | What it does |
|---|---|
| `0017_add_tenants_and_inventory_tenant_id` | Creates `tenants` (seeds "Default Tenant" as id 1). Adds `inventory.tenant_id` via relax → backfill (`UPDATE inventory SET tenant_id = 1`) → constrain (`NOT NULL DEFAULT 1`). Replaces `uq_inventory_card_id` with `uq_inventory_tenant_id_card_id (tenant_id, card_id)` — a future tenant can hold its own row for a card another tenant already tracks. |
| `0018_inventory_row_level_security` | `ALTER TABLE inventory ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`. Policy `tenant_isolation`: `USING (tenant_id = COALESCE(current_setting('app.current_tenant_id', true)::integer, 1))`. The `COALESCE … 1` fallback exists so the table doesn't return zero rows for any session that hasn't called `set_config` — at the time this migration landed, nothing did yet (Stage 3 was still ahead). |
| `0019_create_app_role` | Creates `swu_app` (`LOGIN`, `NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`, password from `APP_DB_PASSWORD` env var). Grants: `USAGE` on schema `public`; `SELECT` on all current tables + sequences; `INSERT, UPDATE, DELETE` on `inventory` only; default privileges so `swu_app` automatically gets `SELECT` on tables/sequences `swu_user` creates in *future* migrations. |
| `0020_add_users_table` | Creates `users` (`id`, `firebase_uid` unique, `tenant_id` FK → `tenants`, `email`, `created_at`). No RLS yet — table is unused until 0021. |
| `0021_users_rls_and_provisioning_grants` | `ALTER TABLE users ENABLE/FORCE ROW LEVEL SECURITY`. Policy `user_self_access`: `USING (firebase_uid = current_setting('app.current_firebase_uid', true))` — keyed on `firebase_uid`, not `tenant_id`, because `tenant_id` is *what this table is used to look up* (not yet known when the lookup runs). No `WITH CHECK` clause — the `USING` expression gates `INSERT` too. Grants `INSERT` on `users` to `swu_app`. **Revokes** `swu_app`'s blanket `SELECT` on `tenants` (from 0019) — once `tenants.name` holds human-readable, email-derived values, blanket `SELECT` would let any session read every other tenant's name. Grants `INSERT` on `tenants` plus `SELECT (id)` only — column-level, because Postgres checks column-level `SELECT` privilege even for `RETURNING id` on a row the same statement just inserted. |

Net effect: `swu_app` can read the full `inventory`/`users`/`tenants`/catalog tables it's granted, but RLS transparently filters `inventory` and `users` to the caller's own rows, and `tenants` is write-only-plus-id for `swu_app` (no way to read another tenant's name).

### 1.6 The two-engine pattern

`app/database.py` defines two completely separate SQLAlchemy engines:

| | `engine` / `SessionLocal` | `app_engine` / `AppSessionLocal` |
|---|---|---|
| Env var | `DATABASE_URL` | `APP_DATABASE_URL` |
| Postgres role | `swu_user` (bootstrap superuser-derived; `BYPASSRLS`) | `swu_app` (least-privilege; `NOBYPASSRLS`) |
| Used by | Alembic (`alembic upgrade head`), ingestion scripts (`apply_seed`, `apply_inventory_snapshot`) | `get_db()` — every request-serving connection |
| RLS applies? | No (bypassed) | Yes |

The migration-running role needs unrestricted write access to set up the schema and grants in the first place; the request-serving role is the one RLS policies actually constrain. Section 1.7.2 explains why this split exists at all.

### 1.7 Design Rationale

#### 1.7.1 Session-scoped `set_config` (third argument `false`), not `SET LOCAL`

**Selected:** `set_config('app.current_tenant_id', tenant_id, false)` — session-scoped, persists until the connection is returned to the pool.

P4 Stage 3's original framing assumed one transaction per request, with `SET LOCAL` (equivalent to `set_config(..., true)`, transaction-scoped) resetting the variable automatically at the end of each request. But `upsert_increment`/`upsert_decrement` call `db.commit()` then `db.refresh(inv)` — **two transactions per request**. `SET LOCAL` reverts at the first `COMMIT`, so the `refresh()` transaction would see `app.current_tenant_id` unset and silently fall back to tenant #1 via migration 0018's `COALESCE` bridge — the wrong tenant's data, with no error.

Session-scoped `set_config` is set once per `get_db()` call (step 7 above) and remains in effect for both transactions, because FastAPI's dependency `yield` keeps the same connection checked out for the whole request.

#### 1.7.2 `swu_app` role split from `swu_user`

**Selected:** a new, separate least-privilege role (`swu_app`, migration 0019) that RLS policies actually apply to; `swu_user` remains the migration-running admin.

P4 Stage 2 discovered that `swu_user` (`POSTGRES_USER` / Cloud SQL's bootstrap role) has `BYPASSRLS`, and `ALTER ROLE swu_user NOSUPERUSER`-equivalent attribute removal is refused outright for the bootstrap role — `FORCE ROW LEVEL SECURITY` alone is not sufficient, because table *owners* bypass RLS by default regardless of `FORCE`. There is no way to make `swu_user` RLS-constrained. `swu_app` is the only role the `tenant_isolation` and `user_self_access` policies are ever evaluated against.

This required adding `APP_DB_PASSWORD` as a Cloud Run env var (Section 3.7) so migration 0019's `CREATE ROLE swu_app WITH LOGIN PASSWORD '...'` — which runs on every container start via `alembic upgrade head` — has a password to use.

#### 1.7.3 Tenant auto-provisioning — "one user, one tenant" (for now)

**Selected:** the first time a `firebase_uid` is seen, create a brand-new `tenants` row *and* a `users` row pointing at it, in the same request. Every user is the sole member of their own tenant.

This is the smallest model that satisfies P5's milestone literally — "two people, two inventories." The alternative (inviting a user to join an *existing* tenant — a household/team scenario) is a real possible future feature, but `users.tenant_id` is just a foreign key: "invite a teammate" becomes a change to provisioning *logic* (point a new user row at an existing tenant instead of creating one), not a schema migration. The current schema doesn't foreclose it.

#### 1.7.4 Auth provider selection — Firebase Authentication vs. Auth0 / Clerk / Supabase Auth

**Selected: Firebase Authentication** (the free tier of GCP Identity Platform), enabled via `google_identity_platform_config` (Section 3.9), Email/Password sign-in only.

| | **Firebase Auth (selected)** | Auth0 | Clerk | Supabase Auth |
|---|---|---|---|---|
| Cost at hobby scale | Free, no practical cap for email/password | Free to ~7,500 MAU, then per-MAU | Free to ~10,000 MAU, then per-MAU | Generous free tier, scoped to a Supabase project |
| GCP-native integration | Same Firebase project already used for Hosting (P2); Cloud Run verifies tokens via ADC, no new secret | None — separate vendor/dashboard/credentials | None | None — second database-adjacent vendor alongside Cloud SQL |
| Frontend DX (React) | Solid official SDK; build-your-own forms | Excellent docs, hosted login page | Best-in-class prebuilt `<SignIn>`/`<SignUp>` | Solid SDK, less-polished prebuilt UI |
| Portability off GCP | Lower — coupled to Firebase/GCP | High | High | Medium — coupled to Supabase |

**What tipped it:** zero new vendor/dashboard, reuse of the existing Firebase project, consistency with the GCP-first reasoning from P1. **Revisit if:** enterprise SSO (SAML/OIDC) is ever needed (Identity Platform's paid tier covers it without switching providers), or portability off GCP becomes a priority (Auth0/Clerk's "works anywhere" trait, with Clerk's prebuilt components cutting frontend rework).

---

## 2. CI/CD Pipeline

### 2.1 Overview

`.github/workflows/ci.yml` defines five jobs:

```
backend ──┐
          ├──► build-and-push ──► deploy ──► frontend-deploy
frontend ─┘         (main only)
```

`backend` and `frontend` run on every push/PR (and gate branch protection on `main`, P3 Stage 4). `build-and-push`, `deploy`, and `frontend-deploy` only run on pushes to `main`, after both test jobs pass.

### 2.2 `backend` job

- Spins up a `postgres` service container.
- Env vars include `DATABASE_URL`, `APP_DATABASE_URL`, `APP_DB_PASSWORD`, `CATALOG_SEED_PATH`, `INVENTORY_SNAPSHOT_PATH`.
- Steps: checkout → `setup-python` → install `backend/requirements.txt` → `alembic upgrade head` → `python -m app.ingestion.apply_seed` → `python -m app.ingestion.apply_inventory_snapshot` → `pytest --cov=app --cov-report=term-missing --cov-fail-under=75`.
- This is the same migration-then-seed-then-snapshot sequence the production Dockerfile runs on every container start (Section 3.5; see also `SWU_Backlog.md` BL-8).

### 2.3 `frontend` job

- `setup-node` → `npm ci` → `npm run build` → `npx vitest run --coverage`.
- Coverage thresholds (`lines`/`statements`) gated at 75%.

### 2.4 `build-and-push` job

- `needs: [backend, frontend]`; `if: github.ref == 'refs/heads/main'`.
- Authenticates to GCP via Workload Identity Federation as `terraform-ci@swu-prod.iam.gserviceaccount.com` (Section 3.3).
- Builds the backend Docker image and pushes it to `us-central1-docker.pkg.dev/swu-prod/backend/api:${{ github.sha }}` (Artifact Registry, Section 3.8).

### 2.5 `deploy` job

- `needs: build-and-push`. WIF auth as `terraform-ci`. `setup-terraform`.
- `terraform init` + `terraform apply -auto-approve -var="backend_image_tag=${{ github.sha }}"` in `terraform/environments/prod`.
- This is the entire production deploy: the new image tag flows into `google_cloud_run_v2_service.backend`'s `image` field (Section 3.5), and `terraform apply` updates the Cloud Run service to a new revision.

### 2.6 `frontend-deploy` job

- `needs: [backend, frontend, deploy]`. WIF auth as `terraform-ci`. `terraform init` (read-only — reads outputs, doesn't apply).
- Reads `firebase_web_app_api_key`, `firebase_web_app_auth_domain`, and `project_id` via `terraform output` (Section 3.9/3.13) — the real `swu-prod` Firebase Web App config, not the local emulator's `demo-swu` fallback (`frontend/src/firebase.ts`).
- Builds the frontend with `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` env vars.
- Deploys via `npx firebase-tools@latest deploy --only hosting --project swu-prod --non-interactive`.

### 2.7 Design Rationale

#### 2.7.1 Workload Identity Federation (OIDC), not service account keys

**Selected (P1):** GitHub Actions authenticates to GCP via WIF — short-lived OIDC tokens, no long-lived JSON key files anywhere (not in git, not in GitHub secrets).

`terraform/environments/prod/wif.tf` creates pool `github-actions` / provider `github`, with `attribute_condition = "assertion.repository == 'whitebreadisu/SWU-Inventory-Manager'"` — belt-and-suspenders with the `principalSet://...attribute.repository/whitebreadisu/SWU-Inventory-Manager` binding on `terraform-ci` itself (Section 3.4). Only `terraform-ci` is WIF-bound; `backend-runtime` is only ever assumed by Cloud Run at runtime via Application Default Credentials, never by CI.

#### 2.7.2 CI coverage gate at 75%, not ratcheted toward 100%

**Selected (P7 Stage 3):** `--cov-fail-under=75` (backend) and `thresholds.lines/statements: 75` (frontend) — chosen as deliberate headroom *below* the actual coverage at the time (~79% backend, ~84.06% frontend).

The gate's purpose is to catch a *regression* (someone adds a large untested module and coverage drops materially), not to chase 100% line coverage as a goal in itself. Setting the threshold close to current coverage would make routine, well-tested small changes fail CI on minor fluctuations.

---

## 3. Terraform Module Map

### 3.1 Environments

| | `swu-prod` | `swu-sandbox` |
|---|---|---|
| Purpose | Persistent, minimal production environment | Ephemeral, non-gating exploration (VPCs, load balancers, etc.) |
| State bucket | `swu-prod-tfstate` | `swu-sandbox-tfstate` |
| Resources | Full stack (below) | P1-bootstrap only: baseline APIs, `terraform-ci` SA + a 7-role subset of prod's IAM list, WIF pool/provider/binding. No Cloud Run/SQL/Secrets/Firebase/Monitoring. |

All resource details below are `swu-prod` unless noted.

### 3.2 State backend

GCS backend, bucket `swu-prod-tfstate`, prefix `terraform/state`. The bucket itself was created by hand in P1, outside Terraform — `iam.tf` grants `terraform-ci` `roles/storage.admin` on it directly (bucket-scoped, not part of the project-level role list) because `terraform apply` itself needs `getIamPolicy`/`setIamPolicy` on the bucket holding its own state.

### 3.3 Workload Identity Federation

`wif.tf`:
- `google_iam_workload_identity_pool.github` — pool id `github-actions`.
- `google_iam_workload_identity_pool_provider.github` — provider id `github`, OIDC issuer `https://token.actions.githubusercontent.com`, attribute mapping `google.subject = assertion.sub`, `attribute.repository = assertion.repository`, `attribute_condition = "assertion.repository == 'whitebreadisu/SWU-Inventory-Manager'"`.
- `google_service_account_iam_member.terraform_ci_wif` — grants `roles/iam.workloadIdentityUser` on `terraform-ci` to `principalSet://iam.googleapis.com/projects/<project_number>/locations/global/workloadIdentityPools/github-actions/attribute.repository/whitebreadisu/SWU-Inventory-Manager`.

### 3.4 IAM

Two service accounts, both created by Terraform:

**`terraform-ci`** (`iam.tf`) — CI's identity, WIF-bound (3.3). Project-level roles (`local.terraform_ci_roles`), each added incrementally with a "which phase needed this" comment:

| Role | Added for |
|---|---|
| `roles/serviceusage.serviceUsageAdmin` | enable new APIs for P2 |
| `roles/run.admin` | deploy/manage Cloud Run (P2) |
| `roles/cloudsql.admin` | provision/manage Cloud SQL (P2) |
| `roles/artifactregistry.admin` | manage the image repo (P2) |
| `roles/iam.serviceAccountAdmin` | create/manage `backend-runtime` (P2) |
| `roles/iam.serviceAccountUser` | attach `backend-runtime` to Cloud Run (P2) |
| `roles/resourcemanager.projectIamAdmin` | grant IAM bindings other resources need (e.g. `backend-runtime` → Cloud SQL Client) |
| `roles/secretmanager.admin` | grant `backend-runtime` access to secrets (P2 stage 3) |
| `roles/iam.workloadIdentityPoolViewer` | P3 stage 3 — `terraform apply` refreshes *all* state, including CI's own WIF pool |
| `roles/firebase.admin` | P5 stage 4 — manage `google_firebase_web_app` (supersedes an earlier `firebase.viewer`) |
| `roles/firebasehosting.admin` | P3 stage 4 — `frontend-deploy`'s `firebase deploy --only hosting` |
| `roles/firebaseauth.admin` | P5 stage 1 — manage Identity Platform config |
| `roles/monitoring.dashboardEditor` | P6 stage 2 — dashboards only (narrower than `monitoring.editor`) |
| `roles/monitoring.alertPolicyEditor`, `roles/monitoring.notificationChannelEditor` | P6 stage 3 — alert policy + notification channel only |

Plus `roles/storage.admin` on `swu-prod-tfstate` directly (3.2).

**`backend-runtime`** (`cloud_run.tf`) — Cloud Run's runtime identity, *not* WIF-bound (only ever assumed via ADC on Cloud Run):
- `roles/cloudsql.client` (project-level) — Cloud SQL Auth Proxy connectivity.
- `roles/secretmanager.secretAccessor` on each of `database-url`, `app-db-password`, `app-database-url` (per-secret `google_secret_manager_secret_iam_member`, Section 3.7) — not project-wide.

### 3.5 Cloud Run

`google_cloud_run_v2_service.backend` (`cloud_run.tf`):

| Setting | Value |
|---|---|
| Name / region | `backend` / `us-central1` |
| Ingress | `INGRESS_TRAFFIC_ALL` (public) |
| Service account | `backend-runtime` |
| Image | `us-central1-docker.pkg.dev/swu-prod/backend/api:${var.backend_image_tag}` — `var.backend_image_tag` defaults to a hardcoded SHA (only matters for a local apply); CI's `deploy` job always overrides it with `-var="backend_image_tag=${{ github.sha }}"` |
| Container port | `8000` (matches the Dockerfile's `uvicorn --port 8000`) |
| Cloud SQL | `volumes` block mounts `google_sql_database_instance.main.connection_name` at `/cloudsql` (native Cloud Run Cloud SQL volume — the env-var DSNs use `?host=/cloudsql/<connection_name>`) |
| Resource limits | None set — Cloud Run defaults apply |

**Env vars:**

| Name | Source |
|---|---|
| `DATABASE_URL` | `secret_key_ref` → `database-url`, version `latest` |
| `APP_DB_PASSWORD` | `secret_key_ref` → `app-db-password`, version `latest` |
| `APP_DATABASE_URL` | `secret_key_ref` → `app-database-url`, version `latest` |
| `ENVIRONMENT` | plain value `"production"` — drives `_api_docs_enabled()` (Section 5) |

**Invoker:** `google_cloud_run_v2_service_iam_member.backend_public` grants `roles/run.invoker` to `allUsers`. The backend is reachable on the public internet with no IAM check; access control is enforced entirely in application code (Section 1, Section 5).

### 3.6 Cloud SQL

`google_sql_database_instance.main` (`database.tf`), name `swu-prod-pg`:

| Setting | Value |
|---|---|
| Engine | `POSTGRES_16` |
| Region | `us-central1` |
| Tier / edition | `db-f1-micro` / `ENTERPRISE` |
| Availability | `ZONAL` (single-zone, no HA failover) |
| Backups | enabled (default retention) |
| Networking | `ipv4_enabled = true`, **no `authorized_networks`** — public IP exists but nothing is allow-listed to reach it; Cloud Run connects via the Cloud SQL connector (IAM-authenticated, Unix socket), not over that path |
| Deletion protection | `true` |

`google_sql_database.inventory` — database `swu_inventory`. `google_sql_user.app` — user `swu_user`, password = `random_password.db_password`. (The RLS-scoped `swu_app` Postgres role is created out-of-band by Alembic migration 0019, not a Terraform resource — its password is the Terraform-managed `random_password.app_db_password`.)

### 3.7 Secret Manager

All four secrets use `replication { auto {} }`, values from `random_password` (32 chars, no special characters) — never hand-set:

| Secret ID | Contents | `secretAccessor` |
|---|---|---|
| `db-password` | `swu_user` password (raw) | none directly — source for `database-url` |
| `database-url` | Full DSN: `postgresql://swu_user:<pw>@/swu_inventory?host=/cloudsql/<connection_name>` — used by `alembic upgrade head` | `backend-runtime` |
| `app-db-password` | `swu_app` password (raw) — read by migration 0019's `CREATE ROLE` on every container start | `backend-runtime` |
| `app-database-url` | Full DSN: `postgresql://swu_app:<pw>@/swu_inventory?host=/cloudsql/<connection_name>` — used by `get_db()` | `backend-runtime` |

### 3.8 Artifact Registry

`google_artifact_registry_repository.backend` — repo id `backend`, format `DOCKER`, location `us-central1`. Resulting path: `us-central1-docker.pkg.dev/swu-prod/backend/api:<tag>`.

### 3.9 Firebase & Identity Platform

- `google_firebase_project.default` (`firebase.tf`, `google-beta`) — enables Firebase on `swu-prod`. The Hosting *site* itself and its content are managed via the Firebase CLI (`frontend/firebase.json` + `firebase deploy`), not Terraform — same Terraform-for-infrastructure / CLI-for-content split as Artifact Registry (repo via Terraform) vs. image push (via `docker`).
- `google_firebase_web_app.default` — registers a Web App under `swu-prod`'s Firebase project (P5 stage 4 prerequisite — lets the deployed frontend use real Firebase Auth instead of the local emulator's `demo-swu` config).
- `data.google_firebase_web_app_config.default` — reads the Web App's `apiKey`/`authDomain`, exposed as Terraform outputs `firebase_web_app_api_key` / `firebase_web_app_auth_domain`, consumed by `ci.yml`'s `frontend-deploy` job (2.6).
- `google_identity_platform_config.default` (`identity_platform.tf`, `google-beta`) — `sign_in.email { enabled = true, password_required = true }`. **Only** Email/Password sign-in is configured — no Google/OAuth/phone providers.

### 3.10 Custom domain

`google_firebase_hosting_custom_domain.swu_subdomain` (`custom_domain.tf`) maps `swu.jeremybradenapps.com` to `swu-prod`'s Firebase Hosting site (`site_id = "swu-prod"`). `wait_dns_verification = false` so `terraform apply` doesn't block on DNS records that don't exist yet — `required_dns_updates` is exposed as an output for manual application to the **separate** `jeremy-portfolio` project's Cloud DNS zone (which is not managed by this Terraform configuration at all).

### 3.11 Frontend ↔ backend connection

`frontend/firebase.json`:

```json
"rewrites": [{ "source": "/api/**", "run": { "serviceId": "backend", "region": "us-central1" } }]
```

Firebase Hosting transparently proxies `/api/**` requests to the Cloud Run `backend` service. From the browser's perspective, `https://swu.jeremybradenapps.com/api/cards` and `https://swu-prod.web.app/api/cards` are **same-origin** requests — CORS is never invoked in production.

`app/main.py`'s CORS middleware (`allow_origins=["http://localhost:5173"]`) exists purely for local dev, where the Vite dev server (port 5173) talks directly to a locally-running backend on a different port. This is *not* a misconfiguration of the production path — see Section 5.

`frontend/src/api/authedFetch.ts` attaches `Authorization: Bearer <Firebase ID token>` (via `auth.currentUser?.getIdToken()`) to every `/api/*` call.

### 3.12 Outputs consumed by CI

| Output | Consumed by |
|---|---|
| `workload_identity_provider` | `google-github-actions/auth` step in every job (auth to GCP) |
| `firebase_web_app_api_key`, `firebase_web_app_auth_domain` | `frontend-deploy` job → `VITE_FIREBASE_*` build env vars |
| `project_id` | `frontend-deploy` job → `VITE_FIREBASE_PROJECT_ID`, `firebase deploy --project` |
| `backend_url`, `cloud_sql_connection_name`, `custom_domain_*`, `terraform_ci_service_account`, `backend_repository_url`, `enabled_apis` | Informational / not directly consumed by CI |

### 3.13 Design Rationale

#### 3.13.1 Hybrid environment model: persistent minimal `swu-prod` + ephemeral `swu-sandbox`

**Selected (P1, foundational):** one always-on, deliberately minimal production project, plus a separate project for exploring infrastructure patterns (VPCs, load balancers, multi-zone) that would be expensive or noisy to keep running permanently.

This gives a real, low-cost production app (the thing actually serving `swu.jeremybradenapps.com`) while still allowing hands-on access to patterns that don't belong in — and would inflate the cost/complexity of — the production environment. `swu-sandbox` deliberately has not tracked `swu-prod`'s P2-P7 additions; it remains at its P1-bootstrap state by design.

#### 3.13.2 Multi-tenancy: shared schema + Postgres RLS, not schema-per-tenant

**Selected (P1/P4, foundational):** one schema, shared tables, `tenant_id` columns + RLS policies (Section 1.5) — "real SaaS-grade isolation" enforced by the database itself, beneath the application layer.

Schema-per-tenant (or database-per-tenant) avoids needing RLS at all, but multiplies migration/connection-management operational overhead per tenant — and at this project's scale (auto-provisioned, one-tenant-per-user, Section 1.7.3), that overhead would grow linearly with signups for no isolation benefit RLS doesn't already provide. RLS works identically on local Postgres and Cloud SQL, so the same policies are exercised in CI (Section 2.2) as in production.

#### 3.13.3 Public Cloud Run ingress (`allUsers`) + app-layer auth

**Selected (P2, revisited at P7 Stage 4):** `ingress = INGRESS_TRAFFIC_ALL` with `roles/run.invoker = allUsers` — the backend URL is reachable by anyone, with access control enforced entirely by `Depends(get_db)` (Section 1).

This was originally adopted at P2 ("It's alive") before auth existed at all, and was *re-verified rather than removed* once P5 added Firebase Auth: P7 Stage 4 live-curl-confirmed `401` on every `/api/*` route without a valid token. This is a common, accepted pattern for services that perform their own authentication — an IAM-level restriction (e.g., requiring a Google-signed `Authorization` header at the Cloud Run layer) would be redundant with, not additive to, the app-layer check, and would complicate the Firebase-Hosting-rewrite path (3.11), which does not send Cloud-Run-IAM-compatible credentials.

---

## 4. Observability

### 4.1 Structured JSON logging

`app/logging_config.py`:
- `JSONFormatter` — formats every log record as one JSON line. Maps `record.levelname` → `severity` (the field Cloud Logging treats specially — see below). `_EXTRA_FIELDS = ("httpRequest", "tenant_id")` are promoted to top-level JSON keys when present. On `exc_info`, the traceback is appended to `message`.
- `configure_logging()` — installs a single JSON `StreamHandler` on stdout for the root logger; disables `uvicorn.access` (superseded by the middleware below); routes `uvicorn`/`uvicorn.error` through the same JSON handler.

`app/middleware.py`'s `log_requests` (registered in `app/main.py` via `app.middleware("http")(log_requests)`):
- Wraps every request. Logs one structured line per request with `httpRequest` (method, URL, status, latency) and `tenant_id` (from `request.state.tenant_id`, set by `get_db()` — Section 1.4 step 8).
- Severity escalates with status code: `error` (5xx), `warning` (4xx), `info` (2xx/3xx).
- On an unhandled exception, logs with `exc_info=True` and status 500 *before* re-raising — this is the entry Cloud Error Reporting (4.4) scans for.

Cloud Run forwards all stdout/stderr to Cloud Logging automatically. The `severity`, `httpRequest`, and `message` keys are Cloud Logging "special fields" — promoted onto the `LogEntry` itself (not buried in `jsonPayload`), which is what makes them filterable/queryable and is what Stage 3's alert policy and Stage 4's Error Reporting both key off.

### 4.2 Cloud Monitoring dashboard

`google_monitoring_dashboard.backend` (`monitoring.tf`) — dashboard "Backend Overview", three tiles, all built from Cloud Run's built-in metrics (zero application code involved):

1. **Request Rate by Response Code** — `run.googleapis.com/request_count`, `ALIGN_RATE`/`REDUCE_SUM`, stacked area, grouped by `response_code_class`.
2. **Error Rate (5xx % of requests)** — Monitoring Query Language (MQL): ratio of 5xx request rate to total request rate × 100, line chart, y-axis `%`.
3. **Request Latency (p50/p95)** — `run.googleapis.com/request_latencies`, `ALIGN_PERCENTILE_50`/`ALIGN_PERCENTILE_95`, `REDUCE_MEAN`, two lines, y-axis `ms`.

### 4.3 Alerting

`monitoring.tf`:
- `google_monitoring_notification_channel.email` — "Jeremy (primary)", type `email`, address `jeremy.braden@gmail.com`.
- `google_monitoring_alert_policy.high_5xx_rate` — "Elevated 5xx Error Rate". Filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="backend" AND metric.type="run.googleapis.com/request_count" AND metric.label.response_code_class="5xx"`. `COMPARISON_GT 0`, `duration = 60s`, `ALIGN_RATE`/`REDUCE_SUM`. Fires on **any** 5xx sustained for 60 seconds. Documentation field points at the dashboard + `severity=ERROR` logs. Live-verified to fire within ~1-2 minutes of a real 500 (P7 Stage 4).

### 4.4 Error Reporting

`clouderrorreporting.googleapis.com` enabled via `google_project_service.p6`. No dedicated Terraform resource — error groups are derived automatically from the structured log entries 4.1 already produces (`severity=ERROR` + stack trace in `message`). Verified via a synthetic `events:report` call (P7 Stage 4); unhandled exceptions are grouped by exception type with first-seen/last-seen tracking.

### 4.5 Design Rationale

#### 4.5.1 Cloud Error Reporting vs. Sentry

**Selected: Cloud Error Reporting.**

| | **Cloud Error Reporting (selected)** | Sentry |
|---|---|---|
| Cost at hobby scale | Free, included with Cloud Logging/Cloud Run | Free to ~5K events/month, then per-event |
| Setup effort | Zero new accounts — reads existing structured logs (4.1) | New account, new SDK dependency, new DSN secret, separate dashboard |
| Error grouping / DX | Groups by exception type + top frame; links back to Cloud Logging. Functional, basic | Industry-leading grouping, release tracking, breadcrumbs, source context |
| Alerting | Same Cloud Monitoring alert policies as 4.3 — one system | Sentry's own separate alerting system |
| Portability off GCP | Low | High |

**What tipped it:** zero new account/SDK/secret, composes directly with 4.1's logging and 4.3's alerting — one "pane of glass." **Revisit if:** error volume/team size grows enough that *triage quality* ("which of these 200 similar errors is new") becomes the bottleneck — Sentry's SDK can run *alongside* continued Cloud Logging as a pure addition, not a migration.

#### 4.5.2 Alert threshold: "any 5xx for 60s," not a percentage

**Selected:** absolute condition (`COMPARISON_GT 0` on the 5xx request-rate metric), not a percentage-of-traffic ratio like the dashboard's error-rate tile.

At `swu-prod`'s current traffic volume, a percentage-based threshold (e.g., "5xx rate > 1% of total") would be statistically meaningless — a handful of total requests makes any percentage either 0% or a huge jump. "Any 5xx, sustained 60 seconds" is the threshold that's actually actionable at this scale; reuses the exact filter/aggregation from the dashboard's request-rate tile (4.2), narrowed to `response_code_class="5xx"`.

---

## 5. Security Posture Summary

Full walkthrough: `SWU_Platform_Security_Review.md` (P7 Stage 4, dated 2026-06-14). This section is a condensed cross-reference — re-read the full review (and re-review it) when the auth/tenancy/infrastructure surface changes meaningfully.

### 5.1 OWASP Top 10 (2021) — status

| Category | Status |
|---|---|
| A01 Broken Access Control | Addressed — Section 1 of this document is the as-built reference; live-verified `401`s on every `/api/*` route without/with-bad token |
| A02 Cryptographic Failures | Addressed — HTTPS everywhere (Cloud Run + Firebase Hosting); secrets are 32-char `random_password`, never hand-set; no passwords stored (Firebase Auth) |
| A03 Injection | Addressed — all runtime SQL via SQLAlchemy `text()` with bound params; the only string-interpolated SQL (migration 0019's `CREATE ROLE`) uses a Terraform-generated secret, not user input, and runs once at migration time |
| A04 Insecure Design | Addressed; **rate limiting deferred** (no per-IP/per-tenant cap on `/api/*` — low severity at current scale) |
| A05 Security Misconfiguration | Addressed — `/docs`/`/redoc`/`/openapi.json` disabled in production via `_api_docs_enabled()` (`ENVIRONMENT != "production"`, `app/main.py`) + `ENVIRONMENT=production` on Cloud Run (3.5); dev-only CORS config is not exercised in prod (3.11) |
| A06 Vulnerable/Outdated Components | Addressed (Dependabot scanning live); **18-PR triage deferred** — `SWU_Backlog.md` BL-9 |
| A07 Auth Failures | Addressed — Firebase Authentication owns credentials entirely; short-lived signed ID tokens, verified server-side |
| A08 Software/Data Integrity | Addressed — WIF/keyless CI auth (2.7.1), CI gates before deploy; **`enforce_admins: false`** on branch protection is an accepted single-developer trade-off |
| A09 Logging/Monitoring | Addressed — Section 4 (structured logging, dashboard, alerting, Error Reporting) |
| A10 SSRF | Not applicable — no backend code fetches a client-supplied URL |

### 5.2 Secrets (Secret Manager)

See Section 3.7 for the full table. All four secrets are `random_password`-generated, `auto` replication, accessible only to `backend-runtime` (per-secret `secretAccessor`, not project-wide) plus `terraform-ci`'s project-level `secretmanager.admin` (needed to *create* those bindings).

### 5.3 Network posture

- **Cloud Run:** public ingress + app-layer auth — by design, see 3.13.3.
- **Cloud SQL:** public IP (`ipv4_enabled = true`) but empty `authorized_networks` — unused attack surface, not an active exposure. Cloud Run connects via the IAM-authenticated Cloud SQL connector over a Unix socket, not the public IP path. `deletion_protection = true`, automated backups, `ZONAL` (no HA — acceptable at current scale; revisit `availability_type = "REGIONAL"` if uptime requirements grow).
- **Keyless auth throughout:** neither `terraform-ci` (WIF) nor `backend-runtime` (Cloud Run ADC) has a long-lived JSON key.

### 5.4 Open follow-ups

1. **`SWU_Backlog.md` BL-9** — triage the 18 open Dependabot PRs (5 failing major-version bumps need individual investigation; #11/#12 likely overlap with #21/#24).
2. **`SWU_Backlog.md` BL-8** — `backend/Dockerfile`'s production `CMD` runs `alembic upgrade head && apply_seed && apply_inventory_snapshot && uvicorn ... --reload` on every Cloud Run container start; `--reload` should be dropped in production (dev-only file-watcher overhead). The migration-on-start pattern is partly intentional (it performed P4's real tenant-#1 backfill) and needs a documented decision, not a blind removal.
3. If the app ever opens beyond its current known users: revisit A04 (rate limiting) and A08 (`enforce_admins`).

---

*— End of Platform Spec —*
