import { render, act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Card } from "../api/cards";
import type { CardSet } from "../api/sets";
import type { BaseCardDetail } from "../api/baseCards";

// ── Mocks ─────────────────────────────────────────────────────────────────

const { getCards } = vi.hoisted(() => ({ getCards: vi.fn() }));
vi.mock("../api/cards", () => ({ getCards }));

const { getSets } = vi.hoisted(() => ({ getSets: vi.fn() }));
vi.mock("../api/sets", () => ({ getSets }));

const { getBaseCardDetail } = vi.hoisted(() => ({ getBaseCardDetail: vi.fn() }));
vi.mock("../api/baseCards", () => ({ getBaseCardDetail }));

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 1,
    base_card_id: 100,
    set_id: 1,
    set_code: "SOR",
    base_card_number: "289",
    card_number: "289",
    name: "Boba Fett",
    subtitle: "Daimyo",
    rarity: "L",
    type: "Unit",
    variant_type: "Standard",
    finish: "Foil",
    channel: "Retail",
    stamped: false,
    is_token: false,
    source_set_code: "SOR",
    swuapi_id: "abc",
    front_image_url: null,
    back_image_url: null,
    stamp_group: null,
    aspects: [],
    keywords: [],
    traits: [],
    cost: 5,
    power: 4,
    hp: 6,
    arena: "Ground",
    ...overrides,
  };
}

const SETS: CardSet[] = [
  { id: 1, code: "SOR", name: "Spark of Rebellion", is_base_set: true },
  { id: 2, code: "SHD", name: "Shadows of the Galaxy", is_base_set: true },
];

function makeDetail(overrides: Partial<BaseCardDetail> = {}): BaseCardDetail {
  return {
    id: 100,
    set_code: "SOR",
    set_name: "Spark of Rebellion",
    base_card_number: "289",
    name: "Boba Fett",
    subtitle: "Daimyo",
    type: "Unit",
    type2: null,
    double_sided: false,
    rarity: "L",
    cost: 5,
    power: 4,
    hp: 6,
    arena: "Ground",
    is_unique: true,
    front_text: null,
    back_text: null,
    epic_action: null,
    artist: null,
    is_token: false,
    aspects: [],
    keywords: [],
    traits: [],
    variants: [],
    ...overrides,
  };
}

describe("CatalogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSets.mockResolvedValue(SETS);
  });

  it("does not render old set-logo toggle buttons", async () => {
    getCards.mockResolvedValue([]);
    const { CatalogPage } = await import("./CatalogPage");
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<CatalogPage />));
    });
    expect(container.querySelector(".set-filter-btn")).toBeNull();
  });

  it("does not render old aspect toggle buttons", async () => {
    getCards.mockResolvedValue([]);
    const { CatalogPage } = await import("./CatalogPage");
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<CatalogPage />));
    });
    expect(container.querySelector(".aspect-filter-btn")).toBeNull();
  });

  it("renders the FilterPanel header", async () => {
    getCards.mockResolvedValue([]);
    const { CatalogPage } = await import("./CatalogPage");
    let getByText!: (text: string) => HTMLElement;
    await act(async () => {
      ({ getByText } = render(<CatalogPage />));
    });
    expect(getByText("Filters")).toBeTruthy();
  });

  it("renders a Variants control whose tooltip lists each variant as finish – number – setName, sorted by own set then card number", async () => {
    getCards.mockResolvedValue([
      makeCard({
        id: 1,
        base_card_id: 100,
        finish: "Foil",
        card_number: "289",
        source_set_code: "SOR",
        set_code: "SOR",
      }),
      makeCard({
        id: 2,
        base_card_id: 100,
        finish: "Hyperspace",
        card_number: "475",
        source_set_code: "SOR",
        set_code: "SOR",
      }),
      makeCard({
        id: 3,
        base_card_id: 100,
        variant_type: "Weekly Play",
        finish: null,
        card_number: "2",
        source_set_code: "SHD",
        set_code: "SOR",
      }),
    ]);

    const { CatalogPage } = await import("./CatalogPage");
    await act(async () => {
      render(<CatalogPage />);
    });
    await waitFor(() => expect(getSets).toHaveBeenCalled());

    const variantsBtn = screen.getByRole("button", { name: "Variants" });
    expect(variantsBtn).toBeTruthy();

    fireEvent.mouseEnter(variantsBtn.parentElement!);

    const rows = document.querySelectorAll(".vt-popover__row");
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toBe("Foil – 289 – Spark of Rebellion");
    expect(rows[1].textContent).toBe("Hyperspace – 475 – Spark of Rebellion");
    expect(rows[2].textContent).toBe("Weekly Play – 2 – Shadows of the Galaxy");
  });

  it("opens CardDetailPopup with the correct baseCardId when a card name is clicked", async () => {
    getCards.mockResolvedValue([makeCard({ base_card_id: 100 })]);
    getBaseCardDetail.mockResolvedValue(makeDetail({ id: 100 }));

    const { CatalogPage } = await import("./CatalogPage");
    await act(async () => {
      render(<CatalogPage />);
    });

    const nameBtn = await screen.findByRole("button", { name: "Boba Fett" });
    fireEvent.click(nameBtn);

    await waitFor(() => expect(getBaseCardDetail).toHaveBeenCalledWith(100));
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });
});
