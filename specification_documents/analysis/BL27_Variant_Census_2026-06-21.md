# BL-27 Variant Census — 2026-06-21

**Analysis only — no vocabulary/grouping/stamp_group decisions made here.** Per `SWU_Backlog.md` BL-33's sequencing, those decisions (finish-vs-provenance mapping, vocabulary normalization, `stamp_group` assignment) are an Opus call (`SWU_Application_Spec.md` §10, §3.2 caveat). This report is the data that decision should be made against.

Source: `backend/app/tests/fixtures/swuapi_export_2026-06-21.json` (8353 cards, full live capture via paginated `/cards`).

## 1. Full `variant_type` vocabulary

**58 distinct values** across 8353 cards.

| variant_type | count |
|---|---|
| Standard | 2314 |
| Hyperspace | 1828 |
| Hyperspace Foil | 1612 |
| Standard Foil | 1368 |
| Serialized Prestige | 208 |
| Standard Prestige | 166 |
| Foil Prestige | 166 |
| Showcase | 126 |
| Weekly Play | 116 |
| Weekly Play Foil | 107 |
| RQ Prize Wall | 31 |
| SQ Prize Wall | 29 |
| Judge Program | 25 |
| SQ Event Pack | 24 |
| GC Event Pack | 22 |
| Convention Exclusive | 18 |
| RQ Event Pack | 16 |
| GC Top 64 | 9 |
| GC VIP Promo | 8 |
| GC Prize Wall | 8 |
| SS Participation | 7 |
| SS Judge | 7 |
| SS Top 8 | 7 |
| SS Top 4 | 7 |
| SS Finalist | 7 |
| SS Champion | 7 |
| PQ Top 4 | 6 |
| PQ Finalist | 6 |
| PQ Champion | 6 |
| PQ Participation | 6 |
| PQ Judge | 6 |
| PQ Top 8 | 6 |
| Prerelease Judge | 6 |
| RQ Judge | 5 |
| SQ Judge | 4 |
| RQ Participation | 4 |
| RQ Day Two | 4 |
| RQ Top 8 | 4 |
| RQ Top 4 | 4 |
| RQ Finalist | 4 |
| RQ Champion | 4 |
| Event Exclusive | 3 |
| SQ Participation | 3 |
| SQ Day Two | 3 |
| SQ Top 8 | 3 |
| SQ Top 4 | 3 |
| SQ Finalist | 3 |
| SQ Champion | 3 |
| Movie Promo | 2 |
| GC Judge | 2 |
| PQ Top 16 | 2 |
| Prerelease Promo | 2 |
| GC Participation | 1 |
| GC Day Three | 1 |
| GC Top 8 | 1 |
| GC Top 4 | 1 |
| GC Finalist | 1 |
| GC Champion | 1 |

## 2. `variant_type` × set_code (provenance) tabulation

set_code here is the variant's own set (matches the target schema's `card_variants.source_set_code`), not the base card's set.

### ASH (267 cards)

| variant_type | count |
|---|---|
| Standard | 267 |

### C24 (6 cards)

| variant_type | count |
|---|---|
| Convention Exclusive | 6 |

### C25 (6 cards)

| variant_type | count |
|---|---|
| Convention Exclusive | 6 |

### C26 (6 cards)

| variant_type | count |
|---|---|
| Convention Exclusive | 6 |

### G25 (2 cards)

| variant_type | count |
|---|---|
| Standard | 2 |

### GG (6 cards)

| variant_type | count |
|---|---|
| Hyperspace Foil | 6 |

### IBH (104 cards)

| variant_type | count |
|---|---|
| Standard | 104 |

### J24 (6 cards)

| variant_type | count |
|---|---|
| Judge Program | 6 |

### J25 (19 cards)

| variant_type | count |
|---|---|
| Judge Program | 19 |

### JTL (1130 cards)

| variant_type | count |
|---|---|
| Standard | 266 |
| Hyperspace | 266 |
| Standard Foil | 236 |
| Hyperspace Foil | 236 |
| Standard Prestige | 36 |
| Foil Prestige | 36 |
| Serialized Prestige | 36 |
| Showcase | 18 |

### JTLP (40 cards)

| variant_type | count |
|---|---|
| Weekly Play | 20 |
| Weekly Play Foil | 20 |

### LAW (913 cards)

| variant_type | count |
|---|---|
| Standard | 267 |
| Hyperspace | 267 |
| Hyperspace Foil | 238 |
| Standard Prestige | 41 |
| Foil Prestige | 41 |
| Serialized Prestige | 41 |
| Showcase | 18 |

### LAWP (40 cards)

| variant_type | count |
|---|---|
| Weekly Play | 20 |
| Weekly Play Foil | 20 |

### LOF (1166 cards)

| variant_type | count |
|---|---|
| Standard | 267 |
| Hyperspace | 267 |
| Hyperspace Foil | 238 |
| Standard Foil | 238 |
| Standard Prestige | 46 |
| Foil Prestige | 46 |
| Serialized Prestige | 46 |
| Showcase | 18 |

### LOFP (40 cards)

| variant_type | count |
|---|---|
| Weekly Play | 20 |
| Weekly Play Foil | 20 |

### MV26 (2 cards)

| variant_type | count |
|---|---|
| Movie Promo | 2 |

### P25 (178 cards)

| variant_type | count |
|---|---|
| GC Event Pack | 22 |
| SQ Prize Wall | 17 |
| RQ Prize Wall | 15 |
| SQ Event Pack | 12 |
| Standard | 10 |
| GC Top 64 | 9 |
| GC VIP Promo | 8 |
| GC Prize Wall | 8 |
| SS Participation | 3 |
| PQ Top 4 | 3 |
| PQ Finalist | 3 |
| PQ Champion | 3 |
| SS Judge | 3 |
| SQ Judge | 3 |
| SS Top 8 | 3 |
| SS Top 4 | 3 |
| SS Finalist | 3 |
| RQ Judge | 3 |
| SS Champion | 3 |
| PQ Participation | 3 |
| PQ Judge | 3 |
| PQ Top 8 | 3 |
| GC Judge | 2 |
| SQ Participation | 2 |
| SQ Day Two | 2 |
| SQ Top 8 | 2 |
| SQ Top 4 | 2 |
| SQ Finalist | 2 |
| SQ Champion | 2 |
| RQ Participation | 2 |
| RQ Day Two | 2 |
| RQ Top 8 | 2 |
| RQ Top 4 | 2 |
| RQ Finalist | 2 |
| RQ Champion | 2 |
| Showcase | 2 |
| GC Participation | 1 |
| GC Day Three | 1 |
| GC Top 8 | 1 |
| GC Top 4 | 1 |
| GC Finalist | 1 |
| GC Champion | 1 |
| Event Exclusive | 1 |

### P26 (90 cards)

| variant_type | count |
|---|---|
| RQ Event Pack | 16 |
| RQ Prize Wall | 16 |
| SQ Prize Wall | 12 |
| SQ Event Pack | 12 |
| RQ Participation | 2 |
| RQ Judge | 2 |
| RQ Day Two | 2 |
| RQ Top 8 | 2 |
| RQ Top 4 | 2 |
| RQ Finalist | 2 |
| RQ Champion | 2 |
| Event Exclusive | 1 |
| PQ Top 8 | 1 |
| PQ Top 4 | 1 |
| PQ Finalist | 1 |
| PQ Champion | 1 |
| SS Participation | 1 |
| SS Judge | 1 |
| SS Top 8 | 1 |
| SS Top 4 | 1 |
| SS Finalist | 1 |
| SQ Participation | 1 |
| SQ Judge | 1 |
| SQ Day Two | 1 |
| SQ Top 8 | 1 |
| SQ Top 4 | 1 |
| SQ Finalist | 1 |
| SQ Champion | 1 |
| SS Champion | 1 |
| PQ Participation | 1 |
| PQ Judge | 1 |

### SEC (1197 cards)

| variant_type | count |
|---|---|
| Standard | 266 |
| Hyperspace | 266 |
| Hyperspace Foil | 238 |
| Standard Foil | 238 |
| Serialized Prestige | 85 |
| Standard Prestige | 43 |
| Foil Prestige | 43 |
| Showcase | 18 |

### SECP (40 cards)

| variant_type | count |
|---|---|
| Weekly Play | 20 |
| Weekly Play Foil | 20 |

### SHD (998 cards)

| variant_type | count |
|---|---|
| Standard | 264 |
| Hyperspace | 244 |
| Standard Foil | 218 |
| Hyperspace Foil | 218 |
| Showcase | 18 |
| Weekly Play | 12 |
| Weekly Play Foil | 8 |
| Prerelease Judge | 2 |
| SS Judge | 1 |
| SS Participation | 1 |
| PQ Participation | 1 |
| PQ Judge | 1 |
| SS Top 8 | 1 |
| SS Top 4 | 1 |
| SS Finalist | 1 |
| PQ Finalist | 1 |
| SS Champion | 1 |
| PQ Champion | 1 |
| PQ Top 16 | 1 |
| PQ Top 8 | 1 |
| PQ Top 4 | 1 |
| Event Exclusive | 1 |

### SHDP (10 cards)

| variant_type | count |
|---|---|
| Hyperspace | 10 |

### SOR (981 cards)

| variant_type | count |
|---|---|
| Standard | 254 |
| Hyperspace | 244 |
| Standard Foil | 218 |
| Hyperspace Foil | 218 |
| Showcase | 16 |
| Weekly Play | 12 |
| Weekly Play Foil | 9 |
| Prerelease Promo | 2 |
| Prerelease Judge | 2 |
| SS Participation | 1 |
| SS Judge | 1 |
| SS Top 8 | 1 |
| SS Top 4 | 1 |
| SS Finalist | 1 |
| SS Champion | 1 |

### SORP (10 cards)

| variant_type | count |
|---|---|
| Hyperspace | 10 |

### TS26 (88 cards)

| variant_type | count |
|---|---|
| Standard | 88 |

### TWI (998 cards)

| variant_type | count |
|---|---|
| Standard | 259 |
| Hyperspace | 244 |
| Standard Foil | 220 |
| Hyperspace Foil | 220 |
| Showcase | 18 |
| Weekly Play | 12 |
| Weekly Play Foil | 10 |
| Prerelease Judge | 2 |
| SS Participation | 1 |
| PQ Participation | 1 |
| SS Judge | 1 |
| PQ Judge | 1 |
| PQ Top 16 | 1 |
| SS Top 8 | 1 |
| PQ Top 8 | 1 |
| SS Top 4 | 1 |
| PQ Top 4 | 1 |
| SS Finalist | 1 |
| PQ Finalist | 1 |
| SS Champion | 1 |
| PQ Champion | 1 |

### TWIP (10 cards)

| variant_type | count |
|---|---|
| Hyperspace | 10 |

## 3. Token marking

**53 cards** have `type` containing "Token" (no dedicated boolean field exists in the raw export).

| token name | distinct printings (across all sets) |
|---|---|
| Experience | 14 |
| Shield | 13 |
| Battle Droid | 6 |
| Clone Trooper | 6 |
| TIE Fighter | 3 |
| X-Wing | 3 |
| Credit | 2 |
| The Force | 2 |
| Spy | 2 |
| Mandalorian | 1 |
| Advantage | 1 |

## 4. Stamp-group candidates

### 4a. By identical `front_image_url` — negative result

Only **5 base-card families** have 2+ variants sharing an identical `front_image_url`, and **none of them are tournament-tier variants.** Verified by spot-checking the mapping spec's own named example — Rey, "Keeping the Past" (P25 cards 59-64, the exact 6-tier RQ family BL-31 cites as pixel-identical art confirmed by direct visual comparison): each of the 6 has a genuinely **distinct** `front_image_url` (different filename hash per tier). **Conclusion: image-URL identity is not a usable signal for BL-31's stamp-group detection** — swuapi must render/hash each stamped variant's image separately even when visually near-identical to a human eye. Confirming true pixel-identity would need actual image diffing, not metadata.

The families this method *did* find (kept for completeness, not because they're useful for BL-31):

| root card | set | variant_types sharing one image | count |
|---|---|---|---|
| Red Three — Unstoppable | SOR | Standard, Standard Foil | 2 |
| Battle Droid | TWI | Standard, Standard Foil | 2 |
| Clone Trooper | TWI | Standard, Standard Foil | 2 |
| Battle Droid | TWI | Hyperspace, Hyperspace Foil | 2 |
| Clone Trooper | TWI | Hyperspace, Hyperspace Foil | 2 |

### 4b. By tournament-tier naming pattern — the signal that works

Grouping instead by `variant_type` prefix (RQ/SQ/GC/PQ/SS — Regional/Store/Grand Championship/Planetary Qualifier/Special-Series Qualifier) resolved to each card's root finds **129 base-card families**, correctly surfacing Rey's 6-member RQ family. This is descriptive only — confirming these are genuinely stamp-only (vs. some carrying real art differences) is still unverified at scale and is part of the Opus decision, not asserted here.

Top 25 by family size (full list has 129 entries — re-run the script for the complete set):

| root card | set | tournament variant_types | count |
|---|---|---|---|
| Darth Vader — Commanding the First Legion | SOR | GC Champion, GC Day Three, GC Finalist, GC Judge, GC Top 4, GC Top 8 | 6 |
| Anakin Skywalker — Champion of Mortis | LOF | GC Event Pack, SQ Champion, SQ Day Two, SQ Finalist, SQ Top 4, SQ Top 8 | 6 |
| Kylo Ren — Killing the Past | SHD | SQ Champion, SQ Day Two, SQ Finalist, SQ Judge, SQ Top 4, SQ Top 8 | 6 |
| Rey — Keeping the Past | SHD | RQ Champion, RQ Day Two, RQ Finalist, RQ Judge, RQ Top 4, RQ Top 8 | 6 |
| Qui-Gon Jinn — The Negotiations Will Be Short | LOF | GC Event Pack, SQ Champion, SQ Day Two, SQ Finalist, SQ Top 4, SQ Top 8 | 6 |
| Grand Inquisitor — You're Right to Be Afraid | LOF | GC Event Pack, SS Champion, SS Finalist, SS Top 4, SS Top 8 | 5 |
| Black One — Straight At Them | JTL | PQ Judge, PQ Participation, RQ Event Pack, RQ Prize Wall | 5 |
| Luke Skywalker — Jedi Knight | SOR | RQ Champion, RQ Day Two, RQ Finalist, RQ Top 4, RQ Top 8 | 5 |
| Darth Traya — Lord of Betrayal | SEC | RQ Champion, RQ Day Two, RQ Finalist, RQ Top 4, RQ Top 8 | 5 |
| Luke Skywalker — Profit or Be Destroyed | LAW | RQ Champion, RQ Day Two, RQ Finalist, RQ Top 4, RQ Top 8 | 5 |
| Doctor Evazan — Wanted on Twelve Systems | SHD | PQ Champion, PQ Finalist, PQ Top 16, PQ Top 4, PQ Top 8 | 5 |
| Tranquility — Inspiring Flagship | TWI | PQ Champion, PQ Finalist, PQ Top 16, PQ Top 4, PQ Top 8 | 5 |
| Home One — On My Mark | JTL | PQ Champion, PQ Finalist, PQ Top 4, PQ Top 8 | 4 |
| Axe Woves — Accomplished Warrior | LOF | SQ Event Pack, SQ Prize Wall | 4 |
| Gungi — Finding Himself | LOF | SQ Event Pack, SQ Prize Wall | 4 |
| HK-47 — Exclamation: Die, Meatbag! | LOF | SQ Event Pack, SQ Prize Wall | 4 |
| IG-2000 — Assassin's Aggressor | JTL | SQ Event Pack, SQ Prize Wall | 4 |
| Planetary Bombardment | JTL | SQ Event Pack, SQ Prize Wall | 4 |
| Aurra Sing — Patient and Deadly | LOF | SQ Event Pack, SQ Prize Wall | 4 |
| Vernestra Rwoh — Precocious Knight | LOF | SQ Event Pack, SQ Prize Wall | 4 |
| Darth Vader — Twilight of the Apprentice | LOF | GC Event Pack, RQ Event Pack, RQ Prize Wall | 4 |
| Darth Malak — Covetous Apprentice | LOF | PQ Champion, PQ Finalist, PQ Top 4, PQ Top 8 | 4 |
| Queen Amidala — Championing Her People | SEC | SS Champion, SS Finalist, SS Top 4, SS Top 8 | 4 |
| Devastator — Hunting the Rebellion | JTL | SS Champion, SS Finalist, SS Top 4, SS Top 8 | 4 |
| Galen Erso — You'll Never Win | SEC | PQ Judge, PQ Participation, SQ Event Pack, SQ Prize Wall | 4 |

## 5. BL-38 re-confirmation — aspect double-pip flattening

Raw-JSON re-check (not WebFetch) of the five physically-verified double-pip cards from the 2026-06-20 finding, against this session's bulk `/cards` capture.

| set | card # | name | expected double aspect | found | raw `aspects` field | has `aspectDuplicates` field |
|---|---|---|---|---|---|---|
| SEC | 54 | Exiled from the Force | Vigilance | True | ['Vigilance'] | False |
| SEC | 107 | Chancellor Valorum | Command | True | ['Command'] | False |
| SOR | 153 | Saw Gerrera | Aggression | True | ['Aggression'] | False |
| SHD | 108 | Enforced Loyalty | Command | True | ['Command'] | False |
| LOF | 105 | Oppo Rancisis | Command | True | ['Command'] | False |

**Confirmed via raw JSON:** all 5 cards return a single-element `aspects` array (`True`), and none expose an `aspectDuplicates` field (`True`). This satisfies BL-38's "depends on" note — the 2026-06-20 WebFetch-based finding is now confirmed against raw JSON, not just a summary.
