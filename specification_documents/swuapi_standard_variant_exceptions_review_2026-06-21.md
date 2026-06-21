# Standard Variant Exceptions — Manual Review (2026-06-21 full census)

Generated from a full live capture of `/cards` (8,353 records, paginated via `offset`, every record carrying `variant_of_uuid`) — see `backend/app/tests/fixtures/swuapi_export_2026-06-21.json`.

Supersedes the prior manual spot-check that found only Zam Wesell. Full census finds **15** roots whose own `variant_type` is not `"Standard"`. For each, this file lists every card anywhere in the corpus matching by case-insensitive `(name, subtitle)` with `variant_type == "Standard"` — a diagnostic cross-reference only, **not** an automatic re-anchor. Per the mapping spec §6 philosophy, these stay flagged exceptions; `variant_of_uuid` (not name matching) is the authoritative resolution mechanism for within-set/container anchoring.

| # | Set | Card # | Name | Subtitle | Variant Type | Cross-set Standard name match(es) |
|---|-----|--------|------|----------|---------------|------------------------------------|
| 1 | C25 | 2 | BB-8 | Happy Beeps | Convention Exclusive | JTL_145 |
| 2 | C25 | 3 | R2-D2 | Artooooooooo! | Convention Exclusive | JTL_245 |
| 3 | C26 | 3 | Zam Wesell | Not What She Seems | Convention Exclusive | **none found** |
| 4 | GG | 1 | Dagobah Swamp |  | Hyperspace Foil | SOR_21 |
| 5 | GG | 2 | Echo Base |  | Hyperspace Foil | SOR_24 |
| 6 | GG | 3 | Catacombs of Cadera |  | Hyperspace Foil | SOR_26 |
| 7 | GG | 4 | Jabba's Palace |  | Hyperspace Foil | SHD_26 |
| 8 | GG | 5 | Experience |  | Hyperspace Foil | JTL_3, LAW_2, LOF_1, SEC_2, SHD_1, SOR_1, TS26_3 |
| 9 | J25 | 4 | Luke Skywalker | You Still With Me? | Judge Program | JTL_94 |
| 10 | J25 | 6 | Darth Vader | Scourge of Squadrons | Judge Program | JTL_142 |
| 11 | JTLP | 10 | BB-8 | Happy Beeps | Weekly Play | JTL_145 |
| 12 | JTLP | 16 | Anakin Skywalker | I'll Try Spinning | Weekly Play | JTL_197 |
| 13 | JTLP | 4 | Cassian Andor | Threading the Eye | Weekly Play | JTL_48 |
| 14 | LOFP | 4 | Gungi | Finding Himself | Weekly Play | LOF_93 |
| 15 | MV26 | 1 | Grogu | Charming Companion | Movie Promo | ASH_18 |

## Notes for review

- **14 of 15 have a cross-set name/subtitle match to a real Standard root** — likely a swuapi link gap (the variant_of_uuid was never populated), not a true orphan. Consistent with the diacritic/casing data-quality issues already documented in BL-28 (R2-D2 "Full of Solutions" casing bug).
- **GG #5 "Experience" matches 7 different Standard roots** (JTL, LAW, LOF, SEC, SHD, SOR, TS26) — this is the generic-token-duplicate-per-set pattern (redesign spec §3.4), not a single resolvable anchor. Confirms tokens cannot be name-matched to one canonical root.
- **Zam Wesell (C26 #3) remains the sole true orphan** — no Standard match anywhere in the corpus. Matches the original BL-28/mapping-spec finding exactly.
- **Recommendation:** keep all 15 as flagged exceptions per the established philosophy (flag, don't block, don't synthesize an anchor `variant_of_uuid` doesn't provide). The cross-set match column here is informational for Jeremy's manual read, not consumed by any ingestion logic.
