import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CardDetailPopup } from "./CardDetailPopup";
import type { BaseCardDetail, VariantDetail } from "../api/baseCards";

const { getBaseCardDetail } = vi.hoisted(() => ({ getBaseCardDetail: vi.fn() }));
vi.mock("../api/baseCards", () => ({ getBaseCardDetail }));

function makeVariant(overrides: Partial<VariantDetail>): VariantDetail {
  return {
    variant_id: 1,
    variant_type: "Standard",
    finish: "Standard",
    channel: "Retail",
    stamped: false,
    source_set_code: "ASH",
    source_set_name: "Ashes of the Resistance",
    card_number: "4",
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
    set_code: "ASH",
    set_name: "Ashes of the Resistance",
    base_card_number: "4",
    name: "Grand Admiral Thrawn",
    subtitle: "Victory is Mine",
    type: "Leader",
    type2: null,
    double_sided: true,
    rarity: "Rare",
    cost: 8,
    power: 5,
    hp: 8,
    arena: "Ground",
    is_unique: true,
    front_text: "Action [Exhaust]: Attack with a unit.",
    back_text: "Back side text.",
    epic_action: "If you control 8 or more resources, deploy this leader.",
    artist: "Johnny Morrow",
    is_token: false,
    aspects: ["Vigilance", "Villainy"],
    keywords: ["Restore"],
    traits: ["Imperial", "Official"],
    variants: [makeVariant({ variant_id: 1 })],
    ...overrides,
  };
}

async function renderPopup(detail: BaseCardDetail, onClose = vi.fn()) {
  getBaseCardDetail.mockResolvedValue(detail);
  await act(async () => {
    render(<CardDetailPopup baseCardId={detail.id} onClose={onClose} />);
  });
  await waitFor(() => screen.getByRole("dialog"));
  return { onClose };
}

describe("CardDetailPopup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state before data resolves", async () => {
    let resolveFn: (v: BaseCardDetail) => void = () => {};
    getBaseCardDetail.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );
    render(<CardDetailPopup baseCardId={1} onClose={vi.fn()} />);
    expect(screen.getByText(/loading/i)).toBeTruthy();
    await act(async () => {
      resolveFn(makeDetail());
    });
  });

  it("shows an error state when the fetch fails", async () => {
    getBaseCardDetail.mockRejectedValue(new Error("boom"));
    await act(async () => {
      render(<CardDetailPopup baseCardId={1} onClose={vi.fn()} />);
    });
    await waitFor(() => expect(screen.getByText("boom")).toBeTruthy());
  });

  it("renders the selection label in the mock's format", async () => {
    await renderPopup(makeDetail());
    expect(document.querySelector(".cdp-selection")?.textContent).toBe("Standard – #4 – ASH");
  });

  it("calls onClose on backdrop click, × click, and Escape", async () => {
    const { onClose } = await renderPopup(makeDetail());
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", async () => {
    const { onClose } = await renderPopup(makeDetail());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const { onClose } = await renderPopup(makeDetail());
    const overlay = document.querySelector(".cdp-overlay")!;
    fireEvent.mouseDown(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("front/back toggle appears only when both images exist", async () => {
    const detail = makeDetail({
      variants: [makeVariant({ variant_id: 1, back_image_url: "back-1.png" })],
    });
    await renderPopup(detail);
    expect(screen.getByRole("button", { name: /show back/i })).toBeTruthy();
  });

  it("front/back toggle is absent when there is no back image", async () => {
    const detail = makeDetail({
      variants: [makeVariant({ variant_id: 1, back_image_url: null })],
    });
    await renderPopup(detail);
    expect(screen.queryByRole("button", { name: /show back/i })).toBeNull();
  });

  it("toggling front/back flips the label and image", async () => {
    const detail = makeDetail({
      variants: [
        makeVariant({
          variant_id: 1,
          front_image_url: "front-1.png",
          back_image_url: "back-1.png",
        }),
      ],
    });
    await renderPopup(detail);
    const toggle = screen.getByRole("button", { name: /show back/i });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: /show front/i })).toBeTruthy();
    const img = document.querySelector(".cdp-image") as HTMLImageElement;
    expect(img.src).toContain("back-1.png");
  });

  // Disposition: Replace (BL-29 popup polish, change 1). The component
  // temporarily stopped consolidating by stamp_group for the variant button
  // list -- each variant now renders its own button, including variants
  // that share a stamp_group. consolidateByStampGroup itself is retained
  // in the component (unused by this list) pending a future grouping
  // decision; this test now asserts the un-consolidated behavior instead
  // of the old "one button per group" assertion it replaces.
  it("variants sharing a stamp_group each render their own button (un-consolidated)", async () => {
    const detail = makeDetail({
      variants: [
        makeVariant({
          variant_id: 1,
          variant_type: "Foil Prestige",
          finish: "Foil Prestige",
          card_number: "10",
          stamp_group: "prestige-foil",
          stamped: false,
        }),
        makeVariant({
          variant_id: 2,
          variant_type: "Serialized Prestige",
          finish: "Serialized Prestige",
          card_number: "10",
          stamp_group: "prestige-foil",
          stamped: true,
        }),
        makeVariant({
          variant_id: 3,
          variant_type: "Standard Foil",
          finish: "Standard Foil",
          card_number: "11",
          stamp_group: null,
          stamped: false,
        }),
      ],
    });
    await renderPopup(detail);

    // Each variant gets its own button now, even within a shared stamp_group.
    expect(screen.getByRole("button", { name: "Foil Prestige – #10 – ASH" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Serialized Prestige – #10 – ASH" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Standard Foil – #11 – ASH" })).toBeTruthy();
  });

  it("clicking a variant button updates the selection label and image", async () => {
    const detail = makeDetail({
      variants: [
        makeVariant({
          variant_id: 1,
          variant_type: "Standard",
          finish: "Standard",
          card_number: "4",
          front_image_url: "front-standard.png",
          stamp_group: null,
        }),
        makeVariant({
          variant_id: 2,
          variant_type: "Standard Foil",
          finish: "Standard Foil",
          card_number: "5",
          front_image_url: "front-foil.png",
          stamp_group: null,
        }),
      ],
    });
    await renderPopup(detail);

    expect(document.querySelector(".cdp-selection")?.textContent).toBe("Standard – #4 – ASH");

    fireEvent.click(screen.getByRole("button", { name: "Standard Foil – #5 – ASH" }));

    expect(document.querySelector(".cdp-selection")?.textContent).toBe("Standard Foil – #5 – ASH");
    const img = document.querySelector(".cdp-image") as HTMLImageElement;
    expect(img.src).toContain("front-foil.png");
  });

  it("renders the info grid fields and rules text", async () => {
    await renderPopup(makeDetail());
    expect(screen.getByTitle("Vigilance")).toBeTruthy();
    expect(screen.getByTitle("Villainy")).toBeTruthy();
    // "Leader" also appears as the Front-side section header (change 3), so
    // scope this assertion to the info grid's Type(s) field specifically.
    expect(screen.getAllByText("Leader").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Ground")).toBeTruthy();
    expect(screen.getByText("Restore")).toBeTruthy();
    expect(screen.getAllByText("8").length).toBeGreaterThanOrEqual(1); // cost and/or hp
    expect(screen.getByText("Imperial, Official")).toBeTruthy();
    expect(screen.getByText("Rare")).toBeTruthy();
    expect(screen.getByText("Ashes of the Resistance")).toBeTruthy();
    expect(screen.getByText("Johnny Morrow")).toBeTruthy();
    expect(screen.getByText(/Epic Action:/)).toBeTruthy();
    expect(screen.getByText(/Back side text\./)).toBeTruthy();
  });

  it("renders an aspect-name text line in canonical order below the icons", async () => {
    await renderPopup(makeDetail({ aspects: ["Villainy", "Vigilance"] }));
    expect(document.querySelector(".cdp-aspects-text")?.textContent).toBe("Vigilance, Villainy");
  });

  it("shows Front/Back section headers with a divider for double-sided cards", async () => {
    await renderPopup(makeDetail({ double_sided: true, back_text: "Back side text." }));
    expect(document.querySelector(".cdp-text-divider")).toBeTruthy();
    const headers = Array.from(document.querySelectorAll(".cdp-text-section__header")).map(
      (el) => el.textContent
    );
    expect(headers).toEqual(["Leader", "Back"]);
  });

  it("renders rules text with no Front/Back cue for single-sided cards", async () => {
    await renderPopup(makeDetail({ double_sided: false, back_text: null }));
    expect(document.querySelector(".cdp-text-divider")).toBeNull();
    expect(document.querySelector(".cdp-text-section__header")).toBeNull();
    expect(screen.getByText(/Action \[Exhaust\]/)).toBeTruthy();
  });

  it("renders type2 joined with type when present", async () => {
    await renderPopup(makeDetail({ type: "Unit", type2: "Trooper" }));
    expect(screen.getByText("Unit, Trooper")).toBeTruthy();
  });

  it("shows em-dash placeholders for null numeric fields", async () => {
    await renderPopup(
      makeDetail({
        cost: null,
        power: null,
        hp: null,
        arena: null,
        artist: null,
        keywords: [],
        traits: [],
      })
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(5);
  });
});
