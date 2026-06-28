import { describe, it, expect } from "vitest";
import { resolveRow, inventoryStatus, splitForVerification, maxCopies } from "./addCardsResolver";
import type { CardWithQty } from "../api/inventory";
import type { Row } from "./addCardsResolver";

// ─────────────────────────────────────────────────────────────────────────
// TEST DISPOSITION LOG (SWU_Catalog_Redesign_Spec.md §5.4 / §8.1)
//
// This suite REPLACES the old single-axis OP-flag/finish resolver tests
// outright (not ported field-for-field) because the resolution model itself
// changed shape: source-set selection is now the primary scoping mechanism,
// and provenance/finish are two independent, ambiguity-gated axes instead
// of one OP boolean + one variant-label list.
//
// Disposition of every test area from the prior suite:
//
// - "auto-resolves when card_number has exactly one non-OP match" / "reports
//   hasOpOption" / "returns needs_variant for OP..." / "resolves to the
//   chosen OP variant..." / "returns error when op=true but no OP cards
//   exist" (the `is_organized_play` / OP-flag-and-collision family)
//     → RETIRE. This is exactly the behavior §3.2/§4.3/§5.4 designed away:
//       "OP" was never a finish, it was (provenance=Weekly Play) x (finish).
//       The card-number-COLLISION bug this guarded (SOR #20 = both Capital
//       City retail AND General Veers OP) is not lost — it is now exercised
//       by "provenance control appears only when >1 channel for the number"
//       below, which uses the *same* SOR #20 fixture shape (one Retail card,
//       one Weekly-Play card sharing card_number "20") and proves the new
//       mechanism (source-set-scoped resolution + channel disambiguation)
//       resolves it correctly. The bug knowledge is carried forward
//       structurally, not dropped.
// - "returns needs_variant when multiple non-OP cards share a
//   [hyperspace/standard] card_number" / "resolves when variant is picked
//   from a multi-match card_number" (the shared standard/foil finish-picker
//   family)
//     → REPLACE. Direct two-axis analog: "finish picker appears only when
//       >1 finish for the (provenance-narrowed) candidates" below, same
//       Resilient Standard/Foil and Hyperspace/Hyperspace-Foil fixture
//       shapes, same assertions in spirit (ambiguous → needs picker; picked
//       → resolves to the right id).
// - "resolves a hyperspace/standard variant via its card_number in a
//   unique-variant-numbers set" (SEC Bail Organa, card_number !=
//   base_card_number)
//     → PORT. Source-set-scoped card_number matching is unchanged behavior;
//       re-expressed below with the new Row/resolved shape.
// - "uses the real subtitle field directly (no hyphen-splitting)"
//     → PORT. name/subtitle still come straight from the real fields.
// - `variantLabelNoOp` describe block
//     → RETIRE. The function itself is retired (folded into the internal
//       `finishLabel` helper used only inside the resolver); there is no
//       longer a "no-OP" label to compute since provenance and finish are
//       separate axes by construction, not a combined label minus OP.
// - `maxCopies` describe block
//     → PORT verbatim (unchanged logic/signature) below.
// - `inventoryStatus` describe block (green/red/leader-at-limit/pending-count)
//     → PORT. Same owned-vs-max math, same "count rows up to and including
//       this row" rule; re-expressed against `variantId` instead of
//       `cardId` and the new Row shape.
// - `splitForVerification` describe block (willAdd/willSkip split, ignores
//   empty/error rows)
//     → PORT. Same split logic; re-expressed against the new Row/resolved
//       shape.
//
// New invariant tests added (§8.2 "two-axis Add Cards resolver"):
// - "long-tail source set pre-sets provenance (no provenance step)" — a
//   container source set (SORP) has all its candidates under one channel by
//   construction, so no provenance control is ever surfaced for it.
// - "single candidate resolves directly without any picker" — sanity check
//   that the common case takes zero ambiguity steps.
// ─────────────────────────────────────────────────────────────────────────

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<CardWithQty>): CardWithQty {
  return {
    id: 1,
    base_card_id: 1,
    set_id: 1,
    set_code: "SOR",
    base_card_number: "1",
    card_number: "1",
    name: "Test Card",
    subtitle: null,
    rarity: "C",
    type: "Unit",
    variant_type: "Standard",
    finish: "Standard",
    channel: "Retail",
    stamped: false,
    is_token: false,
    source_set_code: "SOR",
    swuapi_id: "uuid-1",
    front_image_url: null,
    back_image_url: null,
    stamp_group: null,
    aspects: [],
    keywords: [],
    traits: [],
    cost: 3,
    power: 2,
    hp: 3,
    arena: "Ground",
    quantity: 0,
    ...overrides,
  };
}

function makeRow(overrides: Partial<Row> = {}): Row {
  return { id: "test", cardNumber: "20", channel: null, finish: null, ...overrides };
}

// ─── Test catalog ────────────────────────────────────────────────────────────
//
// All rows below are scoped to source_set_code "SOR" (the base set) unless
// noted — mirroring real SOR data patterns, now keyed on provenance
// (channel) and source_set_code rather than an OP boolean:
//
// card_number '20': 1 Retail (Capital City Standard) + 2 Weekly Play
//   (General Veers Std/Foil) → multi-channel: needs_provenance; once
//   Weekly Play is chosen, 2 finishes remain: needs_finish.
//   This is the exact SOR #20 collision the old OP-flag model special-cased;
//   here it falls out of plain channel/finish disambiguation.
//
// card_number '286': 1 Retail (Capital City Hyperspace), no other channel
//   or finish at this number → auto-resolves.
//
// card_number '69': 2 Retail (Resilient Std/Foil), same channel, two
//   finishes → needs_finish only (no provenance step).
//
// card_number '334': 2 Retail (Resilient Hyperspace Std/Foil) → needs_finish.
//
// card_number '10': 1 Retail Leader (max 1 copy, quantity=1 = at limit).
//
// SEC card_number '272': Bail Organa Hyperspace — card_number !=
//   base_card_number, proves card_number matching is scoped to source set.
//
// SORP (long-tail container source set) card_number '20': the same General
//   Veers Std/Foil rows, but addressed via source_set_code "SORP" directly
//   — proves a long-tail source-set selection pre-sets provenance (single
//   channel by construction) and skips straight to the finish axis.

const sorCapCity = makeCard({
  id: 1,
  base_card_id: 1,
  base_card_number: "20",
  card_number: "20",
  type: "Base",
  name: "Capital City",
  subtitle: null,
  quantity: 0,
});
// Per spec §10.4: early Weekly Play sits IN the base set itself (variant_type
// "Weekly Play"), so source_set_code is "SOR" here, not a container set —
// this is exactly the case that creates a card_number collision within one
// source set and needs the provenance axis to disambiguate.
const sorVeersOp = makeCard({
  id: 2,
  base_card_id: 2,
  base_card_number: "230",
  card_number: "20",
  type: "Unit",
  name: "General Veers",
  subtitle: "Blizzard Force Commander",
  channel: "Weekly Play",
  variant_type: "Weekly Play",
  source_set_code: "SOR",
  quantity: 0,
});
const sorVeersOpFoil = makeCard({
  id: 3,
  base_card_id: 2,
  base_card_number: "230",
  card_number: "20",
  type: "Unit",
  name: "General Veers",
  subtitle: "Blizzard Force Commander",
  channel: "Weekly Play",
  variant_type: "Weekly Play Foil",
  source_set_code: "SOR",
  finish: "Standard Foil",
  quantity: 0,
});

// A later-era long-tail container example for the long-tail-source-set test:
// SORP holds only Hyperspace promos (per §10.4) with channel pre-set by the
// container set itself.
const sorpHyperPromo = makeCard({
  id: 9,
  base_card_id: 2,
  base_card_number: "230",
  card_number: "20",
  type: "Unit",
  name: "General Veers",
  subtitle: "Blizzard Force Commander",
  channel: "Weekly Play",
  variant_type: "Hyperspace",
  finish: "Hyperspace",
  source_set_code: "SORP",
  quantity: 0,
});
const sorpHyperPromoFoil = makeCard({
  id: 11,
  base_card_id: 2,
  base_card_number: "230",
  card_number: "20",
  type: "Unit",
  name: "General Veers",
  subtitle: "Blizzard Force Commander",
  channel: "Weekly Play",
  variant_type: "Hyperspace Foil",
  finish: "Hyperspace Foil",
  source_set_code: "SORP",
  quantity: 0,
});

const sorCapCityHyper = makeCard({
  id: 4,
  base_card_id: 1,
  base_card_number: "20",
  card_number: "286",
  type: "Base",
  name: "Capital City",
  subtitle: null,
  finish: "Hyperspace",
  quantity: 0,
});

const sorResilient = makeCard({
  id: 5,
  base_card_id: 5,
  base_card_number: "69",
  card_number: "69",
  type: "Upgrade",
  name: "Resilient",
  subtitle: null,
  quantity: 0,
});
const sorResilientFoil = makeCard({
  id: 6,
  base_card_id: 5,
  base_card_number: "69",
  card_number: "69",
  type: "Upgrade",
  name: "Resilient",
  subtitle: null,
  finish: "Standard Foil",
  quantity: 2,
});

const sorResilientHyper = makeCard({
  id: 7,
  base_card_id: 5,
  base_card_number: "69",
  card_number: "334",
  type: "Upgrade",
  name: "Resilient",
  subtitle: null,
  finish: "Hyperspace",
  quantity: 0,
});
const sorResilientHyperFoil = makeCard({
  id: 8,
  base_card_id: 5,
  base_card_number: "69",
  card_number: "334",
  type: "Upgrade",
  name: "Resilient",
  subtitle: null,
  finish: "Hyperspace Foil",
  quantity: 0,
});

const sorLeader = makeCard({
  id: 10,
  base_card_id: 10,
  base_card_number: "10",
  card_number: "10",
  type: "Leader",
  name: "Luke Skywalker",
  subtitle: "Faithful Friend",
  quantity: 1,
});

const secStandard = makeCard({
  id: 20,
  base_card_id: 20,
  set_code: "SEC",
  base_card_number: "8",
  card_number: "8",
  type: "Leader",
  name: "Bail Organa",
  subtitle: "Doing Everything He Can",
  source_set_code: "SEC",
  quantity: 0,
});
const secHyperspace = makeCard({
  id: 21,
  base_card_id: 20,
  set_code: "SEC",
  base_card_number: "8",
  card_number: "272",
  type: "Leader",
  name: "Bail Organa",
  subtitle: "Doing Everything He Can",
  finish: "Hyperspace",
  source_set_code: "SEC",
  quantity: 0,
});

const catalog: CardWithQty[] = [
  sorCapCity,
  sorVeersOp,
  sorVeersOpFoil,
  sorpHyperPromo,
  sorpHyperPromoFoil,
  sorCapCityHyper,
  sorResilient,
  sorResilientFoil,
  sorResilientHyper,
  sorResilientHyperFoil,
  sorLeader,
  secStandard,
  secHyperspace,
];

// ─── maxCopies ───────────────────────────────────────────────────────────────

describe("maxCopies", () => {
  it("returns 1 for Leader", () => expect(maxCopies("Leader")).toBe(1));
  it("returns 1 for Base", () => expect(maxCopies("Base")).toBe(1));
  it("returns 3 for Unit", () => expect(maxCopies("Unit")).toBe(3));
  it("returns 3 for Event", () => expect(maxCopies("Event")).toBe(3));
});

// ─── resolveRow ─────────────────────────────────────────────────────────────

describe("resolveRow", () => {
  it("returns empty when cardNumber is blank", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "" }), catalog);
    expect(result.status).toBe("empty");
  });

  it("returns error for an invalid card number", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "999" }), catalog);
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).toMatch(/not valid/i);
    }
  });

  it("resolves directly with no picker when exactly one candidate exists", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "286" }), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.variantId).toBe(sorCapCityHyper.id);
      expect(result.finish).toBe("Hyperspace");
      expect(result.channel).toBe("Retail");
    }
  });

  // ── Axis 1: provenance — surfaced only when >1 distinct channel ──

  it("returns needs_provenance when the card_number spans more than one channel", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "20" }), catalog);
    expect(result.status).toBe("needs_provenance");
    if (result.status === "needs_provenance") {
      expect(result.channels).toContain("Retail");
      expect(result.channels).toContain("Weekly Play");
      expect(result.channels).toHaveLength(2);
      expect(result.name).toBe("Capital City"); // first candidate in catalog order
    }
  });

  it("does not ask for provenance once a channel choice narrows to a single channel", () => {
    // Retail-only candidate at #20 is Capital City — choosing "Retail" should
    // resolve straight through (only one Retail row at this number).
    const result = resolveRow("SOR", makeRow({ cardNumber: "20", channel: "Retail" }), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.variantId).toBe(sorCapCity.id);
      expect(result.channel).toBe("Retail");
    }
  });

  it("after choosing Weekly Play at #20, surfaces needs_finish (the collision case)", () => {
    // This is the old OP-card-number-collision case (SOR #20 = Capital City
    // retail + General Veers Weekly Play): the provenance axis disambiguates
    // away from Capital City, then the finish axis disambiguates the two
    // Veers printings.
    const result = resolveRow(
      "SOR",
      makeRow({ cardNumber: "20", channel: "Weekly Play" }),
      catalog
    );
    expect(result.status).toBe("needs_finish");
    if (result.status === "needs_finish") {
      expect(result.name).toBe("General Veers");
      expect(result.finishes).toContain("Standard");
      expect(result.finishes).toContain("Standard Foil");
      expect(result.finishes).toHaveLength(2);
    }
  });

  it("resolves the chosen Weekly Play finish once both axes are set", () => {
    const result = resolveRow(
      "SOR",
      makeRow({ cardNumber: "20", channel: "Weekly Play", finish: "Standard Foil" }),
      catalog
    );
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.variantId).toBe(sorVeersOpFoil.id);
      expect(result.channel).toBe("Weekly Play");
      expect(result.finish).toBe("Standard Foil");
    }
  });

  it("returns needs_provenance again if a stale finish choice no longer applies", () => {
    // Switching back off a channel choice (channel: null) but leaving a
    // stale finish should not accidentally resolve; provenance is still
    // ambiguous and must be asked again.
    const result = resolveRow(
      "SOR",
      makeRow({ cardNumber: "20", channel: null, finish: "Standard Foil" }),
      catalog
    );
    expect(result.status).toBe("needs_provenance");
  });

  // ── Long-tail source set pre-sets provenance ──

  it("long-tail source set selection pre-sets provenance: no provenance step", () => {
    // Selecting SORP directly (the long-tail container) scopes candidates to
    // source_set_code "SORP", which only ever holds Weekly Play rows — so
    // channels.length is 1 by construction and no provenance control should
    // ever be surfaced, even with zero row.channel set.
    const result = resolveRow("SORP", makeRow({ cardNumber: "20" }), catalog);
    expect(result.status).toBe("needs_finish");
    if (result.status === "needs_finish") {
      expect(result.finishes).toHaveLength(2);
    }
  });

  it("resolves fully within a long-tail source set once finish is picked", () => {
    const result = resolveRow("SORP", makeRow({ cardNumber: "20", finish: "Hyperspace" }), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.variantId).toBe(sorpHyperPromo.id);
      expect(result.channel).toBe("Weekly Play");
    }
  });

  // ── Axis 2: finish — surfaced only when >1 distinct finish ──

  it("returns needs_finish when a single-channel card_number maps to >1 finish (standard set)", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "69" }), catalog);
    expect(result.status).toBe("needs_finish");
    if (result.status === "needs_finish") {
      expect(result.finishes).toContain("Standard");
      expect(result.finishes).toContain("Standard Foil");
      expect(result.finishes).toHaveLength(2);
    }
  });

  it("returns needs_finish when a single-channel card_number maps to >1 finish (hyperspace set)", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "334" }), catalog);
    expect(result.status).toBe("needs_finish");
    if (result.status === "needs_finish") {
      expect(result.finishes).toContain("Hyperspace");
      expect(result.finishes).toContain("Hyperspace Foil");
      expect(result.finishes).toHaveLength(2);
    }
  });

  it("resolves once finish is picked from a multi-finish card_number", () => {
    const result = resolveRow(
      "SOR",
      makeRow({ cardNumber: "69", finish: "Standard Foil" }),
      catalog
    );
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.variantId).toBe(sorResilientFoil.id);
      expect(result.finish).toBe("Standard Foil");
      expect(result.channel).toBe("Retail");
    }
  });

  // ── card_number scoping within a source set (replaces unique-variant-numbers test) ──

  it("resolves a hyperspace variant via its own card_number in a different source set", () => {
    const result = resolveRow("SEC", makeRow({ cardNumber: "272" }), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.variantId).toBe(secHyperspace.id);
      expect(result.finish).toBe("Hyperspace");
    }
  });

  it("resolves the standard variant via its base card_number in a different source set", () => {
    const result = resolveRow("SEC", makeRow({ cardNumber: "8" }), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.variantId).toBe(secStandard.id);
      expect(result.finish).toBe("Standard");
    }
  });

  it("a card_number absent from the selected source set errors, even if it matches another set", () => {
    // card_number "8" only exists under SEC in this catalog; selecting SOR
    // (where it doesn't exist) must error rather than silently cross-match —
    // this is the structural guarantee that retired the OP-collision special
    // case: matching is always scoped to source_set_code.
    const result = resolveRow("SOR", makeRow({ cardNumber: "8" }), catalog);
    expect(result.status).toBe("error");
  });

  // ── Name/subtitle parsing ──

  it("uses the real subtitle field directly (no hyphen-splitting)", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "10" }), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.name).toBe("Luke Skywalker");
      expect(result.subtitle).toBe("Faithful Friend");
    }
  });
});

// ─── inventoryStatus ─────────────────────────────────────────────────────────

describe("inventoryStatus", () => {
  it("returns green when owned + pending is under max", () => {
    // sorResilientFoil has quantity=2, max=3. Adding 1 → 3, not over max.
    const row = makeRow({ cardNumber: "69", finish: "Standard Foil" });
    const rows = [row];
    const resolved = resolveRow("SOR", row, catalog);
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    const status = inventoryStatus("SOR", rows, row, resolved, catalog);
    expect(status.color).toBe("green");
    expect(status.owned).toBe(2);
    expect(status.max).toBe(3);
  });

  it("returns red when owned + pending exceeds max", () => {
    // sorResilientFoil quantity=2, two pending rows for same card → 2+2=4 > 3.
    const row1 = makeRow({ id: "r1", cardNumber: "69", finish: "Standard Foil" });
    const row2 = makeRow({ id: "r2", cardNumber: "69", finish: "Standard Foil" });
    const rows = [row1, row2];
    const resolved = resolveRow("SOR", row2, catalog);
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    const status = inventoryStatus("SOR", rows, row2, resolved, catalog);
    expect(status.color).toBe("red");
  });

  it("counts only rows up to and including the current row (not later rows)", () => {
    const row1 = makeRow({ id: "r1", cardNumber: "20", channel: "Retail" });
    const row2 = makeRow({ id: "r2", cardNumber: "20", channel: "Retail" });
    const row3 = makeRow({ id: "r3", cardNumber: "20", channel: "Retail" });
    const rows = [row1, row2, row3];
    const resolved = resolveRow("SOR", row1, catalog);
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    const status1 = inventoryStatus("SOR", rows, row1, resolved, catalog);
    expect(status1.owned).toBe(0);
    const status3 = inventoryStatus("SOR", rows, row3, resolved, catalog);
    expect(status3.color).toBe("red"); // 0+3 > 1 (Base max=1)
  });

  it("returns red for Leader already at limit (max=1)", () => {
    // sorLeader has quantity=1, max=1
    const row = makeRow({ cardNumber: "10" });
    const rows = [row];
    const resolved = resolveRow("SOR", row, catalog);
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    const status = inventoryStatus("SOR", rows, row, resolved, catalog);
    expect(status.color).toBe("red");
    expect(status.max).toBe(1);
  });
});

// ─── splitForVerification ────────────────────────────────────────────────────

describe("splitForVerification", () => {
  it("puts green rows in willAdd and red rows in willSkip", () => {
    // sorResilientFoil quantity=2, adding 1→3: green
    const rowFoil = makeRow({ id: "f", cardNumber: "69", finish: "Standard Foil" });
    // sorLeader quantity=1, adding 1→2: red (over max=1)
    const rowLeader = makeRow({ id: "l", cardNumber: "10" });
    const rows = [rowFoil, rowLeader];

    const { willAdd, willSkip } = splitForVerification("SOR", rows, catalog);
    expect(willAdd.some((x) => x.row.id === "f")).toBe(true);
    expect(willSkip.some((x) => x.row.id === "l")).toBe(true);
  });

  it("ignores empty, error, and not-yet-disambiguated rows", () => {
    const rowEmpty = makeRow({ id: "e", cardNumber: "" });
    const rowError = makeRow({ id: "x", cardNumber: "999" });
    const rowPending = makeRow({ id: "p", cardNumber: "20" }); // needs_provenance
    const rows = [rowEmpty, rowError, rowPending];

    const { willAdd, willSkip } = splitForVerification("SOR", rows, catalog);
    expect(willAdd).toHaveLength(0);
    expect(willSkip).toHaveLength(0);
  });
});

// ─── Token exclusion (BL-67) ─────────────────────────────────────────────────
//
// Tokens share card_number space with playable cards (e.g. JTL #1 = Asajj
// Ventress Leader AND TIE Fighter Token, both Standard/Retail). The resolver
// must exclude is_token=true variants so card_number lookup always targets
// the playable card, never silently resolves to a token.

describe("resolveRow — token exclusion", () => {
  const jtlLeader = makeCard({
    id: 100,
    set_code: "JTL",
    source_set_code: "JTL",
    card_number: "1",
    base_card_number: "1",
    name: "Asajj Ventress",
    type: "Leader",
    variant_type: "Standard",
    finish: "Standard",
    channel: "Retail",
    is_token: false,
  });

  const jtlToken = makeCard({
    id: 101,
    set_code: "JTL",
    source_set_code: "JTL",
    card_number: "1",
    base_card_number: "1",
    name: "TIE Fighter Token",
    type: "Unit",
    variant_type: "Standard",
    finish: "Standard",
    channel: "Retail",
    is_token: true,
  });

  const jtlCatalog = [jtlLeader, jtlToken];

  it("resolves to the playable card, not the token, when both share a card_number", () => {
    const row = makeRow({ cardNumber: "1" });
    const result = resolveRow("JTL", row, jtlCatalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.variantId).toBe(100);
      expect(result.name).toBe("Asajj Ventress");
    }
  });

  it("does not surface needs_provenance due to a token sharing the same channel", () => {
    // Both Leader and Token are Retail/Standard — without token exclusion,
    // channels.length would be 1 but names would differ, and the wrong card
    // could be silently returned. With exclusion only the Leader remains.
    const row = makeRow({ cardNumber: "1" });
    const result = resolveRow("JTL", row, jtlCatalog);
    expect(result.status).not.toBe("needs_provenance");
  });

  it("errors when only a token exists at the card_number (no playable card)", () => {
    const tokenOnly = [jtlToken];
    const row = makeRow({ cardNumber: "1" });
    const result = resolveRow("JTL", row, tokenOnly);
    expect(result.status).toBe("error");
  });
});
