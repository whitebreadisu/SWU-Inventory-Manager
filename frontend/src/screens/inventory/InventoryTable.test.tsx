import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { InventoryTable } from "./InventoryTable";
import type { InventoryCard } from "../../utils/inventory";

const mockCard: InventoryCard = {
  set_code: "SOR",
  base_card_number: "001",
  name: "Test Unit",
  rarity: "C",
  type: "Unit",
  aspects: [],
  keywords: [],
  traits: ["Rebel"],
  cost: 3,
  power: 2,
  hp: 3,
  arena: "Ground",
  hasStandard: true,
  hasFoil: true,
  hasHyperspace: false,
  hasHyperspaceFoil: false,
  hasPrestige: false,
  hasPrestigeFoil: false,
  hasOp: false,
  hasOpFoil: false,
  inventory: { standard: 1, foil: 0 },
  cardIds: { standard: 101, foil: 102 },
};

describe("InventoryTable", () => {
  it("renders the correct number of variant chips for a card with Standard and Foil variants only", () => {
    const { container } = render(
      <InventoryTable
        cards={[mockCard]}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
        pendingCardIds={new Set()}
      />
    );
    const chips = container.querySelectorAll(".variant-inv__chip");
    expect(chips).toHaveLength(2);
  });
});
