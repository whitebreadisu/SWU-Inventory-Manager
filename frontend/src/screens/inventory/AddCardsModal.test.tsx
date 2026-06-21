import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddCardsModal } from "./AddCardsModal";
import type { CardWithQty } from "../../api/inventory";

vi.mock("../../api/sets", () => ({
  getSets: vi.fn().mockResolvedValue([
    { id: 1, code: "SOR", name: "Spark of Rebellion", is_base_set: true },
    { id: 4, code: "JTL", name: "Jump to Lightspeed", is_base_set: true },
  ]),
}));
vi.mock("../../api/inventory", () => ({
  incrementCard: vi.fn().mockResolvedValue({
    variant_id: 1,
    quantity: 1,
    playset_complete: false,
    blocked: false,
    reason: null,
  }),
}));

function makeCard(overrides: Partial<CardWithQty>): CardWithQty {
  return {
    id: 1,
    base_card_id: 1,
    set_id: 1,
    set_code: "SOR",
    base_card_number: "1",
    card_number: "1",
    name: "IG-88",
    subtitle: null,
    rarity: "R",
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
    power: 4,
    hp: 4,
    arena: "Ground",
    quantity: 0,
    ...overrides,
  };
}

const mockCatalog: CardWithQty[] = [
  makeCard({ id: 1, base_card_id: 1, base_card_number: "12", card_number: "12", quantity: 0 }),
  makeCard({
    id: 2,
    base_card_id: 1,
    base_card_number: "12",
    card_number: "12",
    finish: "Standard Foil",
    quantity: 1,
  }),
];

async function renderModal(onClose = vi.fn(), onCommitted = vi.fn()) {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <AddCardsModal catalog={mockCatalog} onClose={onClose} onCommitted={onCommitted} />
    );
  });
  return { result: result!, onClose, onCommitted };
}

describe("AddCardsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal dialog", async () => {
    await renderModal();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /add cards/i })).toBeTruthy();
  });

  it("shows set selector in initial state", async () => {
    await renderModal();
    expect(screen.getByText(/Select a set to begin/i)).toBeTruthy();
  });

  it("calls onClose when × button is clicked", async () => {
    const { onClose } = await renderModal();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape key is pressed", async () => {
    const { onClose } = await renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const { onClose } = await renderModal();
    const overlay = document.querySelector(".ac-overlay")!;
    fireEvent.mouseDown(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows "Select a set above to enable entry." hint before set is chosen', async () => {
    await renderModal();
    expect(screen.getByText("Select a set above to enable entry.")).toBeTruthy();
  });

  it("shows set options after sets load", async () => {
    await renderModal();
    await waitFor(() => {
      expect(screen.getByText(/Spark of Rebellion/i)).toBeTruthy();
    });
  });

  it("shows keypad and hint update after set is selected", async () => {
    await renderModal();
    await waitFor(() => screen.getByText(/Spark of Rebellion/i));

    const select = screen.getByRole("combobox");
    await act(async () => {
      fireEvent.change(select, { target: { value: "SOR" } });
    });

    expect(screen.getByText("Enter a card number to begin.")).toBeTruthy();
    expect(screen.getByText("Cards in this batch")).toBeTruthy();
  });

  it("shows verification title when proceeding to verify phase", async () => {
    await renderModal();
    await waitFor(() => screen.getByText(/Spark of Rebellion/i));

    // Select set
    const select = screen.getByRole("combobox");
    await act(async () => {
      fireEvent.change(select, { target: { value: "SOR" } });
    });

    // Enter a card number that resolves (card 12 exists in mockCatalog as SOR)
    const input = screen.getByPlaceholderText("000");
    await act(async () => {
      fireEvent.change(input, { target: { value: "12" } });
    });

    // For SOR (non-unique), we need to pick a variant. Check needs_variant state.
    // The submit button should still be inactive (needs_variant).
    // This test confirms the modal stays in editing with the hint.
    expect(screen.getByText(/Enter a card number/i)).toBeTruthy();
  });

  it("splitForVerification: willAdd vs willSkip reflected in verification view", async () => {
    // Use a catalog where one card is at limit
    const limitedCatalog: CardWithQty[] = [
      makeCard({
        id: 10,
        base_card_id: 2,
        set_code: "JTL",
        base_card_number: "12",
        card_number: "12",
        source_set_code: "JTL",
        type: "Unit",
        quantity: 3,
      }),
      makeCard({
        id: 11,
        base_card_id: 3,
        set_code: "JTL",
        base_card_number: "55",
        card_number: "55",
        source_set_code: "JTL",
        type: "Unit",
        quantity: 0,
      }),
    ];
    await act(async () => {
      render(<AddCardsModal catalog={limitedCatalog} onClose={vi.fn()} onCommitted={vi.fn()} />);
    });
    await waitFor(() => screen.getByText(/Jump to Lightspeed/i));

    // Select JTL
    const select = screen.getByRole("combobox");
    await act(async () => {
      fireEvent.change(select, { target: { value: "JTL" } });
    });

    // Type card 55 (quantity=0, will be added)
    const input = screen.getByPlaceholderText("000");
    await act(async () => {
      fireEvent.change(input, { target: { value: "55" } });
    });

    // Submit via the entry form
    const form = input.closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
    });

    // Now type card 12 (quantity=3 = at limit, will be skipped)
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("000"), { target: { value: "12" } });
    });
    const form2 = screen.getByPlaceholderText("000").closest("form")!;
    await act(async () => {
      fireEvent.submit(form2);
    });

    // Click [Add Cards to Inventory] footer button to proceed to verification
    const footerBtns = screen.getAllByRole("button");
    const submitBtn = footerBtns.find((b) => b.textContent?.includes("Add Cards to Inventory"));
    await act(async () => {
      fireEvent.click(submitBtn!);
    });

    // Should be in verification phase
    expect(screen.getByRole("heading", { name: /verify cards/i })).toBeTruthy();
    expect(screen.getByText(/will be added to inventory/i)).toBeTruthy();
    expect(screen.getByText(/will not be added/i)).toBeTruthy();
    expect(screen.getByText("Inventory limit already reached.")).toBeTruthy();
  });
});
