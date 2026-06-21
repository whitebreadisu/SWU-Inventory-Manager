import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { InventorySummary } from "./InventorySummary";
import type { InventoryCard } from "../../utils/inventory";

function makeCard(overrides: Partial<InventoryCard> = {}): InventoryCard {
  return {
    base_card_id: 1,
    set_code: "SOR",
    base_card_number: "1",
    name: "Card",
    subtitle: null,
    rarity: "C",
    type: "Unit",
    aspects: [],
    keywords: [],
    traits: [],
    cost: 1,
    power: 1,
    hp: 1,
    arena: "Ground",
    is_token: false,
    variants: [],
    inventory: {},
    ...overrides,
  };
}

function summaryValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".inv-summary__value")).map(
    (el) => el.textContent ?? ""
  );
}

function summarySub(container: HTMLElement): string {
  return container.querySelector(".inv-summary__sub")?.textContent ?? "";
}

// SWU_Catalog_Redesign_Spec.md §6: tokens behave like normal cards at the
// row level (PlaysetCell pips still render for them -- exercised elsewhere)
// but are excluded from every InventorySummary aggregate: playset %, set %,
// the raw "N cards" count, and the "N unique" count.
describe("InventorySummary token exclusion (§6)", () => {
  it("excludes a token card from every aggregate", () => {
    const nonToken = makeCard({
      base_card_id: 1,
      type: "Unit",
      inventory: { 1: 3 }, // playset-complete, 3 owned
    });
    const token = makeCard({
      base_card_id: 2,
      name: "Battle Droid Token",
      type: "Token Unit",
      is_token: true,
      inventory: { 2: 5 }, // would otherwise dominate the raw count
    });

    const { container } = render(<InventorySummary cards={[nonToken, token]} />);

    // With the token excluded, total=1 and it's playset-complete/owned:
    // playset 100%, set 100%, "3 cards" (not 8), "1 unique" (not 2).
    expect(summaryValues(container)).toEqual(["100%", "100%", "3"]);
    expect(summarySub(container)).toBe("(1 unique)");
  });

  it("returns 0% / 0 cards when only tokens are present (no divide-by-zero on non-token total)", () => {
    const token = makeCard({
      base_card_id: 2,
      is_token: true,
      inventory: { 2: 5 },
    });

    const { container } = render(<InventorySummary cards={[token]} />);

    expect(summaryValues(container)).toEqual(["0%", "0%", "0"]);
    expect(summarySub(container)).toBe("(0 unique)");
  });
});
