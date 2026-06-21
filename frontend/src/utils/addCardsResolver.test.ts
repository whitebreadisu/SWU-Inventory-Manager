import { describe, it, expect } from "vitest";
import {
  resolveRow,
  inventoryStatus,
  splitForVerification,
  variantLabelNoOp,
  maxCopies,
} from "./addCardsResolver";
import type { CardWithQty } from "../api/inventory";
import type { Row } from "./addCardsResolver";

// NOTE: this suite is ported (not rewritten) against the minimal field-mapping
// shim described in addCardsResolver.ts. The old `is_organized_play` boolean
// is approximated as `channel === "Weekly Play"`, and the old finish booleans
// (is_foil/is_hyperspace/...) are approximated as `finish`. This preserves the
// original OP-card-number-collision bug-knowledge (the reason these tests
// exist) until the real two-axis provenance+finish resolver (BL-33 / Add Cards
// rewrite, SWU_Catalog_Redesign_Spec.md §5.4) replaces this shim outright.

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
  return { id: "test", cardNumber: "20", op: false, variant: null, ...overrides };
}

// ─── Test catalog ────────────────────────────────────────────────────────────
//
// Mirrors real SOR data patterns:
//
// card_number '20': 1 non-OP (Capital City Standard) + 2 OP (Veers Std/Foil)
//   → hasOpOption=true; non-OP auto-resolves, OP needs variant pick
//
// card_number '286': 1 non-OP (Capital City Hyperspace), no OP counterpart
//   → hasOpOption=false; auto-resolves
//
// card_number '69': 2 non-OP (Resilient Std/Foil), no OP counterpart
//   → hasOpOption=false; needs variant pick
//
// card_number '334': 2 non-OP (Resilient Hyperspace Std/Foil), no OP counterpart
//   → hasOpOption=false; needs variant pick
//
// card_number '10': 1 non-OP Leader (max 1 copy, quantity=1 = at limit)
//
// SEC card_number '272': Bail Organa Hyperspace — card_number ≠ base_card_number
//   → proves card_number matching works for unique-variant-number sets

// SOR #20 — Capital City (single non-OP) + General Veers OP Std/Foil
const sorCapCity = makeCard({
  id: 1,
  base_card_id: 1,
  set_code: "SOR",
  base_card_number: "20",
  card_number: "20",
  type: "Base",
  name: "Capital City",
  subtitle: null,
  quantity: 0,
});
const sorVeersOp = makeCard({
  id: 2,
  base_card_id: 2,
  set_code: "SOR",
  base_card_number: "230",
  card_number: "20",
  type: "Unit",
  name: "General Veers",
  subtitle: "Blizzard Force Commander",
  channel: "Weekly Play",
  source_set_code: "SORP",
  quantity: 0,
});
const sorVeersOpFoil = makeCard({
  id: 3,
  base_card_id: 2,
  set_code: "SOR",
  base_card_number: "230",
  card_number: "20",
  type: "Unit",
  name: "General Veers",
  subtitle: "Blizzard Force Commander",
  channel: "Weekly Play",
  source_set_code: "SORP",
  finish: "Standard Foil",
  quantity: 0,
});

// SOR #286 — Capital City Hyperspace (single non-OP, no OP at this number)
const sorCapCityHyper = makeCard({
  id: 4,
  base_card_id: 1,
  set_code: "SOR",
  base_card_number: "20",
  card_number: "286",
  type: "Base",
  name: "Capital City",
  subtitle: null,
  finish: "Hyperspace",
  quantity: 0,
});

// SOR #69 — Resilient Standard + Foil (two non-OP share this number)
const sorResilient = makeCard({
  id: 5,
  base_card_id: 5,
  set_code: "SOR",
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
  set_code: "SOR",
  base_card_number: "69",
  card_number: "69",
  type: "Upgrade",
  name: "Resilient",
  subtitle: null,
  finish: "Standard Foil",
  quantity: 2,
});

// SOR #334 — Resilient Hyperspace + Hyperspace Foil (two non-OP share this number)
const sorResilientHyper = makeCard({
  id: 7,
  base_card_id: 5,
  set_code: "SOR",
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
  set_code: "SOR",
  base_card_number: "69",
  card_number: "334",
  type: "Upgrade",
  name: "Resilient",
  subtitle: null,
  finish: "Hyperspace Foil",
  quantity: 0,
});

// SOR #10 — Leader at limit
const sorLeader = makeCard({
  id: 10,
  base_card_id: 10,
  set_code: "SOR",
  base_card_number: "10",
  card_number: "10",
  type: "Leader",
  name: "Luke Skywalker",
  subtitle: "Faithful Friend",
  quantity: 1,
});

// SEC — Bail Organa: card_number ≠ base_card_number (unique-variant-number set pattern)
const secStandard = makeCard({
  id: 20,
  base_card_id: 20,
  set_code: "SEC",
  base_card_number: "8",
  card_number: "8",
  type: "Leader",
  name: "Bail Organa",
  subtitle: "Doing Everything He Can",
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
  quantity: 0,
});

const catalog: CardWithQty[] = [
  sorCapCity,
  sorVeersOp,
  sorVeersOpFoil,
  sorCapCityHyper,
  sorResilient,
  sorResilientFoil,
  sorResilientHyper,
  sorResilientHyperFoil,
  sorLeader,
  secStandard,
  secHyperspace,
];

// ─── variantLabelNoOp ────────────────────────────────────────────────────────

describe("variantLabelNoOp", () => {
  it("returns Standard for a plain card", () => {
    expect(variantLabelNoOp(sorCapCity)).toBe("Standard");
  });
  it("returns Foil for a foil card", () => {
    expect(variantLabelNoOp(sorResilientFoil)).toBe("Standard Foil");
  });
  it("returns the finish label for an OP card too (no OP-specific suffix)", () => {
    expect(variantLabelNoOp(sorVeersOp)).toBe("Standard");
  });
  it("returns Hyperspace for a hyperspace card", () => {
    expect(variantLabelNoOp(sorCapCityHyper)).toBe("Hyperspace");
  });
  it("returns Hyperspace Foil for hyperspace + foil", () => {
    expect(variantLabelNoOp(sorResilientHyperFoil)).toBe("Hyperspace Foil");
  });
});

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

  // ── Spec example 1: SOR #20, OP=false → Capital City Standard, auto-resolve ──

  it("auto-resolves when card_number has exactly one non-OP match", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "20", op: false }), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.cardId).toBe(sorCapCity.id);
      expect(result.variant).toBe("Standard");
      expect(result.isOp).toBe(false);
    }
  });

  it("reports hasOpOption=true when OP cards share the same card_number", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "20", op: false }), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.hasOpOption).toBe(true);
    }
  });

  // ── Spec example 2: SOR #20, OP=true → Veers Standard/Foil picker ──

  it("returns needs_variant for OP when multiple OP cards share the card_number", () => {
    const result = resolveRow(
      "SOR",
      makeRow({ cardNumber: "20", op: true, variant: null }),
      catalog
    );
    expect(result.status).toBe("needs_variant");
    if (result.status === "needs_variant") {
      expect(result.variants).toContain("Standard");
      expect(result.variants).toContain("Standard Foil");
      expect(result.variants).toHaveLength(2);
    }
  });

  it("resolves to the chosen OP variant when variant is picked", () => {
    const result = resolveRow(
      "SOR",
      makeRow({ cardNumber: "20", op: true, variant: "Standard Foil" }),
      catalog
    );
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.cardId).toBe(sorVeersOpFoil.id);
      expect(result.isOp).toBe(true);
    }
  });

  // ── Spec example 3: SOR #286 → Capital City Hyperspace, auto-resolve, no OP ──

  it("auto-resolves a hyperspace card_number with no OP counterpart", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "286" }), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.cardId).toBe(sorCapCityHyper.id);
      expect(result.variant).toBe("Hyperspace");
    }
  });

  it("reports hasOpOption=false when no OP card shares the card_number", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "286" }), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.hasOpOption).toBe(false);
    }
  });

  it("returns error when op=true but no OP cards exist at that card_number", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "286", op: true }), catalog);
    expect(result.status).toBe("error");
  });

  // ── Spec example 4: SOR #334 → Resilient Hyperspace/Hyperspace Foil picker ──

  it("returns needs_variant when multiple non-OP cards share a hyperspace card_number", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "334", variant: null }), catalog);
    expect(result.status).toBe("needs_variant");
    if (result.status === "needs_variant") {
      expect(result.variants).toContain("Hyperspace");
      expect(result.variants).toContain("Hyperspace Foil");
      expect(result.variants).toHaveLength(2);
    }
  });

  // ── Spec example 5: SOR #69 → Resilient Standard/Foil picker ──

  it("returns needs_variant when multiple non-OP cards share the standard card_number", () => {
    const result = resolveRow("SOR", makeRow({ cardNumber: "69", variant: null }), catalog);
    expect(result.status).toBe("needs_variant");
    if (result.status === "needs_variant") {
      expect(result.variants).toContain("Standard");
      expect(result.variants).toContain("Standard Foil");
      expect(result.variants).toHaveLength(2);
    }
  });

  it("resolves when variant is picked from a multi-match card_number", () => {
    const result = resolveRow(
      "SOR",
      makeRow({ cardNumber: "69", variant: "Standard Foil" }),
      catalog
    );
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.cardId).toBe(sorResilientFoil.id);
      expect(result.variant).toBe("Standard Foil");
      expect(result.hasOpOption).toBe(false);
    }
  });

  // ── SEC: unique-variant-number set — card_number matching still applies ──

  it("resolves a hyperspace variant via its card_number in a unique-variant-numbers set", () => {
    const result = resolveRow("SEC", makeRow({ cardNumber: "272" }), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.cardId).toBe(secHyperspace.id);
      expect(result.variant).toBe("Hyperspace");
    }
  });

  it("resolves the standard variant via its card_number in a unique-variant-numbers set", () => {
    const result = resolveRow("SEC", makeRow({ cardNumber: "8" }), catalog);
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.cardId).toBe(secStandard.id);
      expect(result.variant).toBe("Standard");
    }
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
    const row = makeRow({ cardNumber: "69", variant: "Standard Foil" });
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
    const row1 = makeRow({ id: "r1", cardNumber: "69", variant: "Standard Foil" });
    const row2 = makeRow({ id: "r2", cardNumber: "69", variant: "Standard Foil" });
    const rows = [row1, row2];
    const resolved = resolveRow("SOR", row2, catalog);
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    const status = inventoryStatus("SOR", rows, row2, resolved, catalog);
    expect(status.color).toBe("red");
  });

  it("counts only rows up to and including the current row (not later rows)", () => {
    const row1 = makeRow({ id: "r1", cardNumber: "20" });
    const row2 = makeRow({ id: "r2", cardNumber: "20" });
    const row3 = makeRow({ id: "r3", cardNumber: "20" });
    const rows = [row1, row2, row3];
    const resolved = resolveRow("SOR", row1, catalog);
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    // row1: pending=1, owned=0, wouldBe=1 ≤ 1 (Base max=1) → red, but checking the count logic
    const status1 = inventoryStatus("SOR", rows, row1, resolved, catalog);
    expect(status1.owned).toBe(0);
    // row3: pending=3 through this row
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
    const rowFoil = makeRow({ id: "f", cardNumber: "69", variant: "Standard Foil" });
    // sorLeader quantity=1, adding 1→2: red (over max=1)
    const rowLeader = makeRow({ id: "l", cardNumber: "10" });
    const rows = [rowFoil, rowLeader];

    const { willAdd, willSkip } = splitForVerification("SOR", rows, catalog);
    expect(willAdd.some((x) => x.row.id === "f")).toBe(true);
    expect(willSkip.some((x) => x.row.id === "l")).toBe(true);
  });

  it("ignores empty and unresolved rows", () => {
    const rowEmpty = makeRow({ id: "e", cardNumber: "" });
    const rowError = makeRow({ id: "x", cardNumber: "999" });
    const rows = [rowEmpty, rowError];

    const { willAdd, willSkip } = splitForVerification("SOR", rows, catalog);
    expect(willAdd).toHaveLength(0);
    expect(willSkip).toHaveLength(0);
  });
});
