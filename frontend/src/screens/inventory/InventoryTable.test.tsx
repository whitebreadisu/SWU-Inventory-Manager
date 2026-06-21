import { render, screen, fireEvent } from "@testing-library/react";
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
  is_token: false,
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

const zeroOwnedCard: InventoryCard = {
  ...mockCard,
  base_card_id: 2,
  base_card_number: "002",
  name: "Owns Nothing",
  variants: mockCard.variants.map((v) => ({ ...v, quantity: 0 })),
  inventory: { 101: 0, 102: 0 },
};

describe("InventoryTable read-only inventory display", () => {
  it("renders only owned (quantity > 0) variants, with no +/- controls", () => {
    const { container } = render(
      <InventoryTable cards={[mockCard]} onSelectCard={vi.fn()} onSelectInventory={vi.fn()} />
    );
    const chips = container.querySelectorAll(".variant-inv__chip");
    expect(chips).toHaveLength(1);
    expect(chips[0].textContent).toContain("Standard");
    expect(chips[0].textContent).toContain("1");
    expect(container.querySelectorAll("button.variant-inv__step")).toHaveLength(0);
  });

  it('shows a muted "—" when the card owns nothing', () => {
    const { container } = render(
      <InventoryTable cards={[zeroOwnedCard]} onSelectCard={vi.fn()} onSelectInventory={vi.fn()} />
    );
    const cell = container.querySelector("td.td-inventory")!;
    expect(cell.textContent).toBe("—");
  });

  it("clicking the card name calls onSelectCard with the base_card_id", () => {
    const onSelectCard = vi.fn();
    render(
      <InventoryTable cards={[mockCard]} onSelectCard={onSelectCard} onSelectInventory={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Test Unit" }));
    expect(onSelectCard).toHaveBeenCalledWith(1);
  });

  it("clicking the inventory cell calls onSelectInventory with the base_card_id", () => {
    const onSelectInventory = vi.fn();
    const { container } = render(
      <InventoryTable cards={[mockCard]} onSelectCard={vi.fn()} onSelectInventory={onSelectInventory} />
    );
    fireEvent.click(container.querySelector("td.td-inventory")!);
    expect(onSelectInventory).toHaveBeenCalledWith(1);
  });
});
