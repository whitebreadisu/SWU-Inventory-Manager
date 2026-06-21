import { describe, it, expect } from "vitest";
import { groupByBaseCard, sortBaseCards } from "./catalog";
import type { BaseCard } from "./catalog";
import type { Card } from "../api/cards";

// ── Helpers ───────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    base_card_id: 1,
    set_id: 1,
    set_code: "SOR",
    base_card_number: "1",
    card_number: "1",
    name: "Card",
    subtitle: null,
    rarity: "C",
    type: "Unit",
    variant_type: "Standard",
    finish: "Standard",
    channel: "Retail",
    stamped: false,
    is_token: false,
    source_set_code: "SOR",
    swuapi_id: "uuid",
    front_image_url: null,
    back_image_url: null,
    stamp_group: null,
    aspects: [],
    keywords: [],
    traits: [],
    cost: null,
    power: null,
    hp: null,
    arena: null,
    ...overrides,
  };
}

function makeBaseCard(overrides: Partial<BaseCard> = {}): BaseCard {
  return {
    base_card_id: 1,
    set_code: "SOR",
    base_card_number: "1",
    name: "Card",
    subtitle: null,
    type: "Unit",
    rarity: "C",
    aspects: [],
    keywords: [],
    traits: [],
    cost: null,
    power: null,
    hp: null,
    arena: null,
    is_token: false,
    variants: [],
    ...overrides,
  };
}

// ── sortBaseCards (Change B / redesign spec §5.2-§5.3) ─────────────────────
//
// DISPOSITION: no dedicated grouping-sort test existed before this change
// (the old set_code-alphabetical-then-number behavior was only exercised
// incidentally via the now-default sort path in groupByBaseCard /
// groupWithInventory). This is a NEW test suite, not a port, covering the
// new standard sort: (1) set in release order, nulls-last tiebroken by
// set_code, (2) tokens last within a set, (3) base_card_number ascending
// numeric.

describe("sortBaseCards", () => {
  const setOrder = { SOR: "2024-03-08", SHD: "2024-08-02" };

  it("orders by release date across sets, not alphabetically by set_code", () => {
    const shd = makeBaseCard({ base_card_id: 1, set_code: "SHD", base_card_number: "1" });
    const sor = makeBaseCard({ base_card_id: 2, set_code: "SOR", base_card_number: "1" });
    const result = sortBaseCards([shd, sor], setOrder);
    expect(result.map((c) => c.set_code)).toEqual(["SOR", "SHD"]);
  });

  it("sorts sets with a null release_date last, tiebroken by set_code", () => {
    const noDateB = makeBaseCard({ base_card_id: 1, set_code: "PRZ", base_card_number: "1" });
    const noDateA = makeBaseCard({ base_card_id: 2, set_code: "PRM", base_card_number: "1" });
    const dated = makeBaseCard({ base_card_id: 3, set_code: "SOR", base_card_number: "1" });
    const result = sortBaseCards([noDateB, dated, noDateA], setOrder);
    expect(result.map((c) => c.set_code)).toEqual(["SOR", "PRM", "PRZ"]);
  });

  it("treats a set absent from setOrder the same as a null release_date", () => {
    const unknown = makeBaseCard({ base_card_id: 1, set_code: "ZZZ", base_card_number: "1" });
    const dated = makeBaseCard({ base_card_id: 2, set_code: "SOR", base_card_number: "1" });
    const result = sortBaseCards([unknown, dated], setOrder);
    expect(result.map((c) => c.set_code)).toEqual(["SOR", "ZZZ"]);
  });

  it("sorts tokens after non-tokens within the same set", () => {
    const token = makeBaseCard({
      base_card_id: 1,
      set_code: "SOR",
      base_card_number: "1",
      is_token: true,
    });
    const nonToken = makeBaseCard({
      base_card_id: 2,
      set_code: "SOR",
      base_card_number: "2",
      is_token: false,
    });
    const result = sortBaseCards([token, nonToken], setOrder);
    expect(result.map((c) => c.base_card_id)).toEqual([2, 1]);
  });

  it("sorts by base_card_number numerically ascending within a set, after the token split", () => {
    const ten = makeBaseCard({ base_card_id: 1, set_code: "SOR", base_card_number: "10" });
    const two = makeBaseCard({ base_card_id: 2, set_code: "SOR", base_card_number: "2" });
    const result = sortBaseCards([ten, two], setOrder);
    expect(result.map((c) => c.base_card_number)).toEqual(["2", "10"]);
  });

  it("does not mutate the input array", () => {
    const cards = [
      makeBaseCard({ base_card_id: 1, set_code: "SHD", base_card_number: "1" }),
      makeBaseCard({ base_card_id: 2, set_code: "SOR", base_card_number: "1" }),
    ];
    const original = [...cards];
    sortBaseCards(cards, setOrder);
    expect(cards).toEqual(original);
  });
});

// ── groupByBaseCard (sort wiring) ───────────────────────────────────────────

describe("groupByBaseCard", () => {
  it("applies the standard sort using the provided setOrder", () => {
    const cards = [
      makeCard({ base_card_id: 1, set_code: "SHD", base_card_number: "1" }),
      makeCard({ base_card_id: 2, set_code: "SOR", base_card_number: "1" }),
    ];
    const result = groupByBaseCard(cards, { SOR: "2024-03-08", SHD: "2024-08-02" });
    expect(result.map((c) => c.set_code)).toEqual(["SOR", "SHD"]);
  });

  it("falls back to null-release-date ordering (set_code tiebreak) when no setOrder is given", () => {
    const cards = [
      makeCard({ base_card_id: 1, set_code: "SHD", base_card_number: "1" }),
      makeCard({ base_card_id: 2, set_code: "SOR", base_card_number: "1" }),
    ];
    const result = groupByBaseCard(cards);
    expect(result.map((c) => c.set_code)).toEqual(["SHD", "SOR"]);
  });
});
