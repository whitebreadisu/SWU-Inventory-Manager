import { describe, it, expect } from "vitest";
import { groupWithInventory } from "./inventory";
import type { CardWithQty } from "../api/inventory";

// DISPOSITION: no dedicated grouping-sort test existed before this change;
// this is a NEW test (not a port) covering groupWithInventory's standard
// sort wiring (Change B). The comparator itself is exercised in depth by
// catalog.test.ts's sortBaseCards suite — these tests just confirm
// groupWithInventory passes the setOrder through correctly.

function makeCard(overrides: Partial<CardWithQty> = {}): CardWithQty {
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
    quantity: 0,
    ...overrides,
  };
}

describe("groupWithInventory", () => {
  it("applies the standard sort using the provided setOrder", () => {
    const cards = [
      makeCard({ base_card_id: 1, set_code: "SHD", base_card_number: "1" }),
      makeCard({ base_card_id: 2, set_code: "SOR", base_card_number: "1" }),
    ];
    const result = groupWithInventory(cards, { SOR: "2024-03-08", SHD: "2024-08-02" });
    expect(result.map((c) => c.set_code)).toEqual(["SOR", "SHD"]);
  });

  it("sorts tokens after non-tokens within a set", () => {
    const cards = [
      makeCard({ base_card_id: 1, set_code: "SOR", base_card_number: "1", is_token: true }),
      makeCard({ base_card_id: 2, set_code: "SOR", base_card_number: "2", is_token: false }),
    ];
    const result = groupWithInventory(cards, { SOR: "2024-03-08" });
    expect(result.map((c) => c.base_card_id)).toEqual([2, 1]);
  });

  // DISPOSITION (REPLACE): SOR and SHD are both in CURATED_SET_ORDER
  // (catalog.ts), so with no setOrder given the fallback is now the curated
  // index, not an alphabetical set_code tiebreak — the previous assertion
  // (["SHD", "SOR"]) no longer matches the new fallback tier.
  it("falls back to curated set order when no setOrder is given", () => {
    const cards = [
      makeCard({ base_card_id: 1, set_code: "SHD", base_card_number: "1" }),
      makeCard({ base_card_id: 2, set_code: "SOR", base_card_number: "1" }),
    ];
    const result = groupWithInventory(cards);
    expect(result.map((c) => c.set_code)).toEqual(["SOR", "SHD"]);
  });

  it("falls back to set_code tiebreak when sets have no release_date and no curated entry", () => {
    const cards = [
      makeCard({ base_card_id: 1, set_code: "ZZZ", base_card_number: "1" }),
      makeCard({ base_card_id: 2, set_code: "AAA", base_card_number: "1" }),
    ];
    const result = groupWithInventory(cards);
    expect(result.map((c) => c.set_code)).toEqual(["AAA", "ZZZ"]);
  });

  it("still aggregates inventory quantities per variant correctly", () => {
    const cards = [
      makeCard({ id: 1, base_card_id: 1, quantity: 2 }),
      makeCard({ id: 2, base_card_id: 1, variant_type: "Foil", quantity: 1 }),
    ];
    const result = groupWithInventory(cards);
    expect(result).toHaveLength(1);
    expect(result[0].inventory).toEqual({ 1: 2, 2: 1 });
  });
});
