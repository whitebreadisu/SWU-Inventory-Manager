# SWU Platform Security Review (P7 Stage 4)

**Date:** 2026-06-14
**Scope:** OWASP Top 10 (2021) walkthrough of the SWU Inventory Manager backend/frontend, plus a secrets and network review of the `swu-prod` GCP project.

This is the "wrap-up audit" for P7 — a deliberate, point-in-time pass over the application's security posture, written as a document rather than a deploy. It records what's addressed (and how/where), and what's knowingly deferred along with the residual risk. Re-review when the auth/tenancy/infrastructure surface changes meaningfully.

## OWASP Top 10 (2021) Walkthrough

### A01:2021 – Broken Access Control — Addressed

- Every `/api/*` route depends on `Depends(get_db)` (`app/database.py`), which requires a valid Firebase ID token verified by `app/auth.py`'s `verify_firebase_token`/`get_current_identity`.
- Live-verified against `https://backend-qsolsepaya-uc.a.run.app`:
  - `GET /api/inventory` with no `Authorization` header → `401`, `{"detail":"Missing or invalid Authorization header"}`
  - `GET /api/inventory` with `Authorization: Bearer notarealtoken` → `401`
  - `GET /api/cards` with no `Authorization` header → `401` — even though `cards` is shared catalog data with no `tenant_id`/RLS, every `/api/*` route requires authentication uniformly, not just tenant-scoped ones.
  - `GET /health` → `200`, unauthenticated — the only intentionally open route.
- Row-level security provides defense-in-depth beneath the app-layer check: migration `0018` (`inventory.tenant_isolation`) and migration `0021` (`users.user_self_access`, `tenants` column-level grants). P7 Stage 3 added direct integration-test coverage for both. Even a hypothetical bug in `get_db()`'s tenant-scoping logic could not leak another tenant's `inventory`/`users` rows, because Postgres itself enforces the policy for the `swu_app` role the app connects as.
- `swu_user` (the migration/admin role, `BYPASSRLS`) is used only by Alembic via `DATABASE_URL`, never by the request-serving connection (`APP_DATABASE_URL`/`swu_app`) — confirmed in `app/database.py`.

### A02:2021 – Cryptographic Failures — Addressed

- All public traffic is HTTPS: Cloud Run terminates TLS for the backend; Firebase Hosting enforces HTTPS (with redirect) for the frontend.
- Database credentials (`db-password`, `app-db-password`) are 32-character `random_password` Terraform resources — never hand-chosen, never committed.
- The `database-url`/`app-database-url` secrets (full DSNs, including those passwords) live in Secret Manager and are injected into Cloud Run as env vars via `secret_key_ref` — never in source, never printed by CI.
- `.env` is gitignored and untracked in both `backend/` and `frontend/`; only `.env.example` files with placeholder values are committed.
- The app stores no user passwords — authentication is delegated entirely to Firebase Authentication (Identity Platform). The backend only ever sees short-lived, signed ID tokens (RS256 JWTs), verified against Google's rotating public keys.

### A03:2021 – Injection — Addressed

- Every runtime SQL statement uses SQLAlchemy `text()` with bound parameters (`:name` placeholders). A repo-wide check found no `f"SELECT ... {user_input}"`-style string-built SQL in any request-handling path.
- The only string-interpolated SQL in the codebase:
  - Migration `0019_create_app_role.py`: `CREATE ROLE swu_app WITH LOGIN PASSWORD '{password}'`, where `password` is `os.environ["APP_DB_PASSWORD"]` (a Terraform-generated secret, not user input), with `'` escaped via `.replace("'", "''")`. Runs once, at migration time — never per-request.
  - `app/ingestion/generate_seed.py` / `generate_inventory_snapshot.py`'s `sql_string()` helper — builds static `.sql` files from catalog/inventory CSVs at dev-time, with the same `'`-escaping. The output is a committed file, reviewed before `apply_seed`/`apply_inventory_snapshot` run it — not a runtime path.
- React escapes interpolated values by default, so rendering API responses (card names, etc.) carries no obvious DOM-based XSS vector. `dangerouslySetInnerHTML` is not used anywhere in `frontend/src`.

### A04:2021 – Insecure Design — Addressed, with one deferred item

- Multi-tenancy (P4) and concurrency-safety (P7 Stage 2) were both deliberate design phases with dedicated regression tests, not retrofits.
- **Deferred — no application-level rate limiting.** `/api/*` has no per-IP/per-tenant request-rate cap; Cloud Run's autoscaling absorbs load rather than rejecting it. Firebase Authentication has its own sign-in rate limiting (outside this app's code). Residual risk: an authenticated client repeatedly hitting `/api/inventory/{id}/increment` would increase Cloud Run cost before anything pushes back — low severity for a small, known set of users, but worth revisiting if the app ever opens more broadly.
- **N/A — CSRF.** The API uses `Authorization: Bearer <token>` exclusively (`allow_credentials=True` is set in CORS for completeness, but no cookie carries the session). With no ambient credential, there's nothing a forged cross-site request could ride on — CSRF tokens and `SameSite` cookie protections don't apply to a Bearer-token API.

### A05:2021 – Security Misconfiguration — Mostly addressed; one minor finding

- **Finding (minor): `/docs` and `/openapi.json` are publicly reachable.** Live-verified — both return `200` with no `Authorization` header against `https://backend-qsolsepaya-uc.a.run.app`. FastAPI serves Swagger UI/OpenAPI schema by default unless `docs_url`/`openapi_url`/`redoc_url` are set to `None`. This doesn't expose data (every documented endpoint still requires a valid token), but it does expose the full API surface — route paths and request/response field names (`firebase_uid`, `tenant_id`, etc.) — to anyone who finds the URL. Residual risk is low (the source is already on a public GitHub repo), but disabling docs in production is a one-line, low-risk follow-up (`docs_url=None, redoc_url=None, openapi_url=None`, gated on an env var so local dev keeps `/docs`). Recorded here rather than fixed now, to keep Stage 4 a document, not a deploy.
- CORS (`allow_origins=["http://localhost:5173"]`) is a dev-only origin and is **not** exercised by the production frontend — `frontend/firebase.json` rewrites `/api/**` to the Cloud Run backend, so `swu-prod.web.app`/`swu.jeremybradenapps.com` call `/api/*` same-origin, never triggering CORS at all. The setting is overly *restrictive* for the raw Cloud Run URL (a browser-based client at the prod origin couldn't call it directly via `fetch`), not overly permissive — not a vulnerability as configured, just dev-only config that happens to also be the only config that exists.
- Cloud Run ingress is `INGRESS_TRAFFIC_ALL` with `roles/run.invoker = allUsers` — intentional. Access control is enforced at the application layer (A01), confirmed live. This is a common, accepted pattern for Cloud Run services that do their own auth.
- No stack traces or internal details are returned to clients on error — FastAPI's default exception handlers return generic JSON; full tracebacks go to structured logs (P6 Stage 1) with `severity=ERROR`, not to the response body.

### A06:2021 – Vulnerable and Outdated Components — Addressed (scanning); triage deferred

- Dependabot alerts + version updates enabled (P7 Stage 1): `.github/dependabot.yml` covers `pip` (`/backend`), `npm` (`/frontend`), and `github-actions` (`/`) on a weekly schedule.
- **7 open Dependabot alerts**, all in dev/test tooling, none in production request-handling libraries:
  - npm devDependencies: `esbuild` (×2), `vitest`, `uuid`, `vite`
  - pip: `python-dotenv`, `pytest`
  - `fastapi`, `sqlalchemy`, `psycopg2-binary`, `firebase-admin` — the libraries actually in the runtime request path — have no open alerts.
- **18 open Dependabot version-update PRs** (#8, #9, #11–#27) — more than the single TypeScript PR anticipated when this stage was planned. 13 pass CI as-is; 5 fail (#9, #19, #21, #22, #24 — major-version bumps to `pytest`, `pytest-asyncio`, `vitest`, and `@vitejs/plugin-react`).
  - **Decision (2026-06-14):** document the current state and defer triage to a dedicated future session, rather than fold an 18-PR merge/investigation pass into Stage 4. None of the 18 PRs touch a library with an open security alert — this is routine version-update backlog, not an unaddressed CVE.
  - **Notes for that session:** the two "multi" PRs (#11, #12 — bumping `vite`/`@vitejs/plugin-react`/`vitest` together) likely overlap with the single-package PRs for the same libraries (#21, #24); check for redundancy before merging both. The 5 failing PRs are all major-version bumps and will need their CI failures investigated individually (likely breaking API changes in `pytest` 9, `vitest` 4, `@vitejs/plugin-react` 6), not just re-run.

### A07:2021 – Identification and Authentication Failures — Addressed

- Firebase Authentication (Identity Platform) owns credential storage, hashing, and the sign-in flow entirely — the app never sees or stores a password.
- `app/auth.py`'s `verify_firebase_token` uses the Firebase Admin SDK's `verify_id_token`, which checks the token's signature (against Google's rotating public keys), expiry, issuer, and audience — a full verification, not just a decode.
- ID tokens are short-lived; the frontend's `authedFetch` calls `getIdToken()` per request, so the SDK transparently refreshes near-expiry tokens.
- New `firebase_uid`s are auto-provisioned (own tenant + user row, P5 Stage 2) on first authenticated request — no separate signup-approval step, appropriate for this app's "anyone with a login gets their own private inventory" model.

### A08:2021 – Software and Data Integrity Failures — Addressed

- CI/CD authenticates to GCP via Workload Identity Federation (OIDC) — no long-lived service account keys exist for `terraform-ci`, in git or anywhere else (P1).
- Every change to `main` runs through `ci.yml`'s `backend`/`frontend` jobs (tests + coverage gates, P7 Stage 3) before `build-and-push`/`deploy` run.
- Branch protection on `main` requires those checks to pass (P3 Stage 4) — but `enforce_admins: false`, so a repo admin (Jeremy) can push directly, bypassing CI. Documented, accepted trade-off for a single-developer project; would need revisiting if collaborators are added.
- Terraform state lives in a GCS bucket (`swu-prod-tfstate`), not in git — infrastructure changes are tracked and applied through a single, auditable path (`terraform apply` in CI).

### A09:2021 – Security Logging and Monitoring Failures — Addressed (P6)

- Structured JSON logging with `severity`/`httpRequest`/`tenant_id` fields (Stage 1) — every request and unhandled exception is a queryable Cloud Logging entry.
- Cloud Monitoring dashboard for the backend service (Stage 2).
- Alert policy + email notification channel for elevated 5xx error rates (Stage 3) — live-verified to fire within ~1-2 minutes of a real `500`.
- Cloud Error Reporting enabled (Stage 4) — unhandled exceptions are grouped by type, with first-seen/last-seen tracking, verified via a synthetic `events:report` call.

### A10:2021 – Server-Side Request Forgery (SSRF) — Not applicable

- No backend code accepts a URL from a client and fetches it. The only outbound network calls the backend makes are to its own Cloud SQL instance (fixed Unix-socket path) and to Google's Firebase Admin SDK endpoints (fixed, SDK-managed) — neither is influenced by request input.

## Secrets & Network Review

### Secret Manager

Four secrets, all `auto` replication, with `random_password`-generated values (never hand-set):

| Secret | Contents | Readable by |
|---|---|---|
| `db-password` | `swu_user` (migration/admin role) password | not directly granted — exists as the Terraform source of truth for the password embedded in `database-url` |
| `database-url` | Full DSN for `swu_user`, used by `alembic upgrade head` at container start | `backend_runtime` SA only |
| `app-db-password` | `swu_app` (RLS-scoped runtime role) password | not directly granted — embedded in `app-database-url` |
| `app-database-url` | Full DSN for `swu_app`, used by `app/database.py`'s request-serving connection | `backend_runtime` SA only |

All values that reach Cloud Run are injected as env vars via `secret_key_ref` — never written to a config file, never logged (P6's structured logger logs request metadata, not env vars).

### IAM

- `terraform_ci`'s role list (`iam.tf`) has grown incrementally, one phase/stage at a time, each addition commented with which stage needed it — no blanket `roles/editor` or `roles/owner` at any point. The broadest single grant is `roles/resourcemanager.projectIamAdmin`, needed because `terraform-ci` must be able to grant IAM roles to *other* service accounts it creates (e.g., `backend_runtime` → Cloud SQL Client) as part of normal applies.
- `backend_runtime` (the Cloud Run service's identity) holds `roles/secretmanager.secretAccessor`, granted per-secret via `google_secret_manager_secret_iam_member` (scoped to the 2 DSN secrets above, not project-wide), plus whatever Cloud SQL connectivity role the connector needs — it cannot manage infrastructure, only read its own secrets and connect to its own database.
- Neither `terraform-ci` (WIF) nor `backend_runtime` (attached to Cloud Run, ADC) has a long-lived JSON key file — both use keyless auth.

### Cloud Run Ingress

- `ingress = "INGRESS_TRAFFIC_ALL"`, `roles/run.invoker = allUsers` — the backend's URL is reachable from the public internet with no IAM check at the Cloud Run layer. Intentional: access control is enforced in application code (A01), and live-verified — every `/api/*` route returns `401` without a valid Firebase ID token; only `/health` is open.

### Cloud SQL Connectivity

- `ipv4_enabled = true`, no `authorized_networks` configured. The instance has a public IP address, but with an empty allow-list nothing can reach it over that path — Cloud Run connects via the Cloud SQL connector (IAM-authenticated, Unix-socket), per the comment in `database.tf`. The public IP is currently unused attack surface rather than an active exposure — worth keeping in mind if `authorized_networks` is ever populated for a one-off debugging session and not cleaned up afterward.
- `deletion_protection = true`, automated backups enabled, `db-f1-micro`/`ZONAL` (single-zone, no HA) — appropriate for current scale; would need `availability_type = "REGIONAL"` if uptime requirements grow.

## Summary

| Category | Status |
|---|---|
| A01 Broken Access Control | Addressed |
| A02 Cryptographic Failures | Addressed |
| A03 Injection | Addressed |
| A04 Insecure Design | Addressed; rate limiting deferred (low risk) |
| A05 Security Misconfiguration | Addressed; `/docs` exposure noted (low risk) |
| A06 Vulnerable/Outdated Components | Addressed (scanning); 18-PR triage deferred |
| A07 Auth Failures | Addressed |
| A08 Software/Data Integrity | Addressed; admin CI-bypass is an accepted trade-off |
| A09 Logging/Monitoring | Addressed |
| A10 SSRF | Not applicable |

**Open follow-ups (none blocking, all low-severity):**

1. Disable `/docs`/`/openapi.json`/`/redoc` in production (one-line FastAPI config change, gated on env).
2. Dedicated session to triage the 18 open Dependabot PRs (5 failing major-version bumps need individual investigation; #11/#12 likely overlap with #21/#24).
3. If the app ever opens beyond its current known users, revisit rate limiting (A04) and `enforce_admins` on branch protection (A08).
