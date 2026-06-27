# ADR-0005: Catalog performance — client-side payload-shrink + virtualization (not server-side pagination)

## Status
Accepted — 2026-06-27 (pending implementation; tracked as BL-44, with BL-56/BL-70/BL-73 sitting on it)

## Context
The catalog (`base_cards`/`card_variants`) is now at full scale (~2,306 base cards, ~8,353 variants) and the Catalog view takes a few seconds to become usable. The slowness has two distinct costs that are easy to conflate:
1. **Fetch + parse + client-side grouping** of the payload, and
2. **Rendering** ~2,306 rows into the DOM at once (no virtualization).

Two code facts shape the decision:
- **`GET /api/cards` returns a flat list of ~8,353 variant rows, each carrying the full base-card data** — `name`, `subtitle`, `rarity`, `type`, `cost/power/hp/arena`, and the `aspects[]`/`keywords[]`/`traits[]` arrays are duplicated on *every* variant row even though there are only ~2,306 base cards (~3.6× redundancy). The client then groups those rows back down to base cards.
- A **nested base-card-with-variants shape already exists** for the single-card popup (`GET /api/base-cards/{id}` → `BaseCardDetail` with a `variants[]` array). A *list* version of that shape is therefore cheap to build.

A hard constraint: **filtering is client-side over in-memory data, and its instant response is a valued feature.** The faceted-filter design (BL-70) and the AND/OR toggle (BL-71) are specified client-side and depend on the full dataset being present in the browser.

Options genuinely considered:
- **(A) Status quo** — fix nothing. Filtering stays instant, but initial load stays slow and the DOM render stays janky.
- **(B) Client-side payload-shrink + virtualization** — add a base-cards-with-nested-variants *list* endpoint (shrinks the fetch and eliminates client-side grouping), and window the DOM render of the fully-loaded in-memory list.
- **(C) Server-side pagination + filtering** — fetch one page at a time. Fixes initial load most aggressively, **but filtering must move server-side** (you cannot client-filter data you have not fetched), which turns every filter change into a network round-trip to Cloud Run + Cloud SQL and **breaks the BL-70/BL-71 client-side faceting design**. Heaviest rework.

A DevTools measurement to attribute the lag precisely (fetch vs. parse vs. render) was deliberately treated as a *learning* exercise, not a gate — the decision is made on the code analysis above.

## Decision
Adopt **Option B — stay client-side**, with two levers, both scoped to v1.0:
1. **Payload-shrink:** add a `base-cards-with-nested-variants` **list** endpoint (reusing the existing `BaseCardDetail` shape). The client fetches ~2,306 base cards with nested variants instead of ~8,353 flat rows, removing the per-variant duplication of base-card data and eliminating the client-side grouping step. All data stays client-side, so filtering remains instant and faceting is preserved.
2. **Virtualization:** window the DOM render of the fully-loaded in-memory list (~30 rows rendered at a time), as a **continuous scroll** (not page controls); the scrollbar reflects the true full length.

Reject **Option C (server-side)** unless the catalog grows by an order of magnitude — its cost is the instant filter response and the client-side faceting, which are explicitly valued.

## Consequences
- **+** Preserves the instant client-side filtering and the BL-70/BL-71 faceting design — the thing most valued about the current build is untouched.
- **+** Fixes initial load: roughly half the bytes (base-card data deduped from ~8,353 to ~2,306 occurrences; per-variant image URLs stay), fewer objects to parse, and the client-side grouping pass is removed entirely.
- **+** Fixes render jank via windowing, independent of payload.
- **+** Low effort: the nested endpoint shape already exists for the popup, so payload-shrink is largely assembly, not new design.
- **+** A self-hosted-thumbnail path (BL-76) and the gallery view (BL-73) compose cleanly on top of this client-side model.
- **−** Initial load is *faster*, not *instant* — the client still downloads the whole (shrunk) base-card set up front. Truly minimal load would require Option C.
- **−** Bakes in the assumption that the entire catalog fits comfortably in browser memory. True at SWU's scale (a few thousand base cards) for years; an order-of-magnitude growth would force revisiting Option C and moving filtering server-side.
- **−** Virtualization adds a windowing dependency (e.g. react-window/TanStack Virtual) and the usual windowing caveats (variable row heights, scroll restoration, in-view measurement).
- **−** Does not address Cloud Run **cold-start** latency on the very first request after idle — that is a separate platform lever (`min-instances`), not a payload concern.

**Related:** BL-44 (perf epic / implementation), BL-70 + BL-71 (client-side faceting this protects), BL-56 (the unified catalog/inventory view this renders), BL-73 (gallery view), BL-76 (image hosting / thumbnails). Supersedes the "levers for later discussion" framing originally recorded in BL-44.
