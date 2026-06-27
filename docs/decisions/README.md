# Architecture Decision Records (ADRs)

This folder holds **Architecture Decision Records** — short, numbered, append-only notes that capture *why* a significant architectural decision was made: the forces at the time, the alternatives weighed, and the consequences accepted.

## Conventions
- One decision per file, named `NNNN-kebab-title.md`.
- ADRs are **immutable once Accepted.** A decision is never edited to change its meaning — instead a new ADR *supersedes* it (the new one references the old; the old one's Status is set to `Superseded by ADR-NNNN`).
- Use [`0000-template.md`](0000-template.md) as the starting point.

## When to write one
A decision earns an ADR when it is *most* of: structural / cross-cutting · expensive to reverse · had real alternatives · would make a future reader ask "why is it this way?". Routine, easily-reversible choices do **not** get an ADR. A healthy project has ~a dozen, not a hundred.

## Index
| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-rls-tenant-isolation.md) | Tenant isolation via Postgres Row-Level Security | Accepted |
| [0002](0002-csv-to-swuapi-rewrite.md) | Rewrite catalog ingestion from CSV to swuapi | Accepted |
| [0003](0003-two-axis-variant-model.md) | Two-axis variant model (finish × provenance) | Accepted |
| [0004](0004-catalog-bootstrap-from-swuapi-export.md) | Bootstrap the catalog by ingesting the committed swuapi export on startup | Accepted |
| [0005](0005-catalog-performance-client-side.md) | Catalog performance — client-side payload-shrink + virtualization | Accepted |
