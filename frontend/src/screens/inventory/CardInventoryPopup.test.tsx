import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CardInventoryPopup } from "./CardInventoryPopup";
import type { BaseCardDetail, VariantDetail } from "../../api/baseCards";

const { getBaseCardDetail } = vi.hoisted(() => ({ getBaseCardDetail: vi.fn() }));
vi.mock("../../api/baseCards", () => ({ getBaseCardDetail }));

const { incrementCard, decrementCard } = vi.hoisted(() => ({
  incrementCard: vi.fn(),
  decrementCard: vi.fn(),
}));
vi.mock("../../api/inventory", () => ({ incrementCard, decrementCard }));

function makeVariant(overrides: Partial<VariantDetail>): VariantDetail {
  return {
    variant_id: 1,
    variant_type: "Standard",
    finish: "Standard",
    channel: "Retail",
    stamped: false,
    source_set_code: "SOR",
    source_set_name: "Spark of Rebellion",
    card_number: "12",
    front_image_url: "front-1.png",
    back_image_url: null,
    stamp_group: null,
    quantity: 0,
    ...overrides,
  };
}

function makeDetail(overrides: Partial<BaseCardDetail> = {}): BaseCardDetail {
  return {
    id: 1,
    set_code: "SOR",
    set_name: "Spark of Rebellion",
    base_card_number: "12",
    name: "IG-88",
    subtitle: "Cold-Blooded Killer",
    type: "Unit",
    type2: null,
    double_sided: false,
    rarity: "Rare",
    cost: 3,
    power: 4,
    hp: 4,
    arena: "Ground",
    is_unique: false,
    front_text: null,
    back_text: null,
    epic_action: null,
    artist: null,
    is_token: false,
    aspects: [],
    keywords: [],
    traits: [],
    variants: [makeVariant({ variant_id: 1 })],
    ...overrides,
  };
}

async function renderPopup(detail: BaseCardDetail, onClose = vi.fn(), onChanged = vi.fn()) {
  getBaseCardDetail.mockResolvedValue(detail);
  await act(async () => {
    render(<CardInventoryPopup baseCardId={detail.id} onClose={onClose} onChanged={onChanged} />);
  });
  await waitFor(() => screen.getByRole("dialog"));
  return { onClose, onChanged };
}

describe("CardInventoryPopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the variant list with quantities", async () => {
    await renderPopup(
      makeDetail({
        variants: [
          makeVariant({ variant_id: 1, quantity: 2, card_number: "12" }),
          makeVariant({
            variant_id: 2,
            finish: "Standard Foil",
            quantity: 1,
            card_number: "13",
          }),
        ],
      })
    );
    expect(screen.getByText("Standard – #12 – SOR")).toBeTruthy();
    expect(screen.getByText("Standard Foil – #13 – SOR")).toBeTruthy();
  });

  it("+ calls incrementCard with the variant_id and reflects the new quantity", async () => {
    incrementCard.mockResolvedValue({
      variant_id: 1,
      quantity: 1,
      playset_complete: false,
      blocked: false,
      reason: null,
    });
    await renderPopup(makeDetail({ variants: [makeVariant({ variant_id: 1, quantity: 0 })] }));

    const incBtn = screen.getByRole("button", { name: /increment/i });
    await act(async () => {
      fireEvent.click(incBtn);
    });

    expect(incrementCard).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.getByText("1")).toBeTruthy());
  });

  it("− calls decrementCard with the variant_id and reflects the new quantity", async () => {
    decrementCard.mockResolvedValue({ variant_id: 1, quantity: 1 });
    await renderPopup(makeDetail({ variants: [makeVariant({ variant_id: 1, quantity: 2 })] }));

    const decBtn = screen.getByRole("button", { name: /decrement/i });
    await act(async () => {
      fireEvent.click(decBtn);
    });

    expect(decrementCard).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.getByText("1")).toBeTruthy());
  });

  it("− is disabled at quantity 0", async () => {
    await renderPopup(makeDetail({ variants: [makeVariant({ variant_id: 1, quantity: 0 })] }));
    const decBtn = screen.getByRole("button", { name: /decrement/i }) as HTMLButtonElement;
    expect(decBtn.disabled).toBe(true);
  });

  it("+ is disabled at the playset cap (sum = 3) for a non-Leader card", async () => {
    await renderPopup(
      makeDetail({
        type: "Unit",
        variants: [
          makeVariant({ variant_id: 1, quantity: 2, card_number: "12" }),
          makeVariant({
            variant_id: 2,
            finish: "Standard Foil",
            quantity: 1,
            card_number: "13",
          }),
        ],
      })
    );
    const incButtons = screen.getAllByRole("button", { name: /increment/i }) as HTMLButtonElement[];
    expect(incButtons.every((b) => b.disabled)).toBe(true);
  });

  it("+ is disabled at quantity 1 for a Leader variant (singleton cap)", async () => {
    await renderPopup(
      makeDetail({
        type: "Leader",
        variants: [makeVariant({ variant_id: 1, quantity: 1, card_number: "1" })],
      })
    );
    const incBtn = screen.getByRole("button", { name: /increment/i }) as HTMLButtonElement;
    expect(incBtn.disabled).toBe(true);
  });

  it("+ does not apply the increment when the response is blocked", async () => {
    incrementCard.mockResolvedValue({
      variant_id: 1,
      quantity: 2,
      playset_complete: false,
      blocked: true,
      reason: "trade_sell",
    });
    await renderPopup(
      makeDetail({
        type: "Unit",
        variants: [makeVariant({ variant_id: 1, quantity: 2, card_number: "12" })],
      })
    );
    const incBtn = screen.getByRole("button", { name: /increment/i });
    await act(async () => {
      fireEvent.click(incBtn);
    });
    // Quantity stays at 2 -- the blocked response is not applied.
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("calls onChanged on close only if a change was made", async () => {
    decrementCard.mockResolvedValue({ variant_id: 1, quantity: 1 });
    const { onClose, onChanged } = await renderPopup(
      makeDetail({ variants: [makeVariant({ variant_id: 1, quantity: 2 })] })
    );

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("calls onChanged on close after a change was made", async () => {
    decrementCard.mockResolvedValue({ variant_id: 1, quantity: 1 });
    const { onChanged } = await renderPopup(
      makeDetail({ variants: [makeVariant({ variant_id: 1, quantity: 2 })] })
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /decrement/i }));
    });
    await waitFor(() => expect(screen.getByText("1")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onChanged).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", async () => {
    const { onClose } = await renderPopup(makeDetail());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const { onClose } = await renderPopup(makeDetail());
    const overlay = document.querySelector(".cip-overlay")!;
    fireEvent.mouseDown(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
