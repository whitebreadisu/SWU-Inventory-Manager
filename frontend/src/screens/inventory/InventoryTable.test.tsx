import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { InventoryTable } from "./InventoryTable";
import type { InventoryCard } from "../../utils/inventory";

const mockCard: InventoryCard = {
  base_card_id: 1,
  set_code: "SOR",
  base_card_number: "001",
  name: "Test Unit",
  subtitle: null,
  rarity: "C",
  type: "Unit",
  aspects: [],
  keywords: [],
  traits: ["Rebel"],
  cost: 3,
  power: 2,
  hp: 3,
  arena: "Ground",
  variants: [
    {
      variant_id: 101,
      variant_type: "Standard",
      finish: "Standard",
      channel: "Retail",
      stamped: false,
      source_set_code: "SOR",
      card_number: "001",
      front_image_url: null,
      back_image_url: null,
      stamp_group: null,
      quantity: 1,
    },
    {
      variant_id: 102,
      variant_type: "Foil",
      finish: "Standard Foil",
      channel: "Retail",
      stamped: false,
      source_set_code: "SOR",
      card_number: "001",
      front_image_url: null,
      back_image_url: null,
      stamp_group: null,
      quantity: 0,
    },
  ],
  inventory: { 101: 1, 102: 0 },
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
