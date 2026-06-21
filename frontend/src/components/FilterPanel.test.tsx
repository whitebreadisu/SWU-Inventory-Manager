import { useState } from "react";
import { render, act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { applyFilters, DEFAULT_FILTERS, FilterPanel } from "./FilterPanel";
import type { FilterState } from "./FilterPanel";
import type { BaseCard, Variant } from "../utils/catalog";
import type { CardSet } from "../api/sets";

// ── Helpers ───────────────────────────────────────────────────────────────

vi.mock("../api/cards", () => ({
  getCards: vi.fn(() => Promise.resolve([])),
}));

const { getSets } = vi.hoisted(() => ({ getSets: vi.fn() }));
vi.mock("../api/sets", () => ({ getSets }));

function makeVariant(overrides: Partial<Variant> = {}): Variant {
  return {
    variant_id: 1,
    variant_type: "Standard",
    finish: "Standard",
    channel: "Retail",
    stamped: false,
    source_set_code: "SOR",
    card_number: "001",
    front_image_url: null,
    back_image_url: null,
    stamp_group: null,
    ...overrides,
  };
}

function makeCard(overrides: Partial<BaseCard> = {}): BaseCard {
  return {
    base_card_id: 1,
    set_code: "SOR",
    base_card_number: "001",
    name: "Test Unit",
    subtitle: null,
    rarity: "C",
    type: "Unit",
    aspects: [],
    keywords: [],
    traits: [],
    cost: null,
    power: null,
    hp: null,
    arena: null,
    variants: [makeVariant()],
    ...overrides,
  };
}

function withSearch(search: string): FilterState {
  return { ...DEFAULT_FILTERS, aspects: new Set(DEFAULT_FILTERS.aspects), search };
}

// ── applyFilters tests ────────────────────────────────────────────────────

describe("applyFilters", () => {
  it("matches card by name when search term is in the name", () => {
    const cards = [
      makeCard({ name: "Luke Skywalker" }),
      makeCard({ base_card_number: "002", name: "Darth Vader" }),
    ];
    const result = applyFilters(cards, withSearch("luke"));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Luke Skywalker");
  });

  it("matches card by subtitle when search term is in the subtitle portion", () => {
    const cards = [
      makeCard({ name: "Director Krennic - Aspiring to Authority", type: "Leader" }),
      makeCard({ base_card_number: "002", name: "Luke Skywalker" }),
    ];
    const result = applyFilters(cards, withSearch("aspiring"));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Director Krennic - Aspiring to Authority");
  });

  it("excludes cards that do not match the search term", () => {
    const cards = [makeCard({ name: "Han Solo" })];
    const result = applyFilters(cards, withSearch("vader"));
    expect(result).toHaveLength(0);
  });

  it("returns only cards that have the selected finish", () => {
    const standard = makeCard({
      base_card_number: "001",
      variants: [makeVariant({ finish: "Standard" })],
    });
    const foil = makeCard({
      base_card_number: "002",
      variants: [makeVariant({ variant_id: 2, finish: "Standard Foil" })],
    });
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      aspects: new Set(DEFAULT_FILTERS.aspects),
      finish: new Set(["Standard Foil"]),
    };
    const result = applyFilters([standard, foil], filters);
    expect(result).toHaveLength(1);
    expect(result[0].base_card_number).toBe("002");
  });

  it("excludes cards outside the cost range", () => {
    const low = makeCard({ base_card_number: "001", cost: 2 });
    const mid = makeCard({ base_card_number: "002", cost: 5 });
    const high = makeCard({ base_card_number: "003", cost: 10 });
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      aspects: new Set(DEFAULT_FILTERS.aspects),
      costRange: [3, 7],
    };
    const result = applyFilters([low, mid, high], filters);
    expect(result).toHaveLength(1);
    expect(result[0].base_card_number).toBe("002");
  });

  it("excludes cards with null cost when cost range is narrowed", () => {
    const nullCost = makeCard({ cost: null });
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      aspects: new Set(DEFAULT_FILTERS.aspects),
      costRange: [1, 5],
    };
    const result = applyFilters([nullCost], filters);
    expect(result).toHaveLength(0);
  });
});

// ── FilterPanel set toggle (§5.1) ──────────────────────────────────────────

const BASE_SET: CardSet = { id: 1, code: "SOR", name: "Spark of Rebellion", is_base_set: true };
const LONG_TAIL_SET: CardSet = { id: 2, code: "PRM", name: "Promotional", is_base_set: false };

describe("FilterPanel set toggle", () => {
  function setup() {
    getSets.mockResolvedValue([BASE_SET, LONG_TAIL_SET]);
    const Wrapper = () => {
      const [filters, setFilters] = useState(DEFAULT_FILTERS);
      return <FilterPanel filters={filters} setFilters={setFilters} cards={[]} />;
    };
    return Wrapper;
  }

  it("shows only base sets by default in the Set dropdown", async () => {
    const Wrapper = setup();
    await act(async () => {
      render(<Wrapper />);
    });
    fireEvent.click(screen.getByText("Filters"));
    await waitFor(() => expect(getSets).toHaveBeenCalled());
    const setLabel = await screen.findByText("Set");
    const setButton = setLabel.closest(".ifp-field")!.querySelector(".ifp-multi__button")!;
    fireEvent.click(setButton);

    expect(screen.getByText(/SOR/)).toBeTruthy();
    expect(screen.queryByText(/PRM/)).toBeNull();
  });

  it("reveals long-tail sets after clicking the toggle, and hides them again on re-toggle", async () => {
    const Wrapper = setup();
    await act(async () => {
      render(<Wrapper />);
    });
    fireEvent.click(screen.getByText("Filters"));
    await waitFor(() => expect(getSets).toHaveBeenCalled());
    const setLabel = await screen.findByText("Set");
    const setButton = setLabel.closest(".ifp-field")!.querySelector(".ifp-multi__button")!;
    fireEvent.click(setButton);

    const toggleBtn = screen.getByText("Show all sets");
    fireEvent.click(toggleBtn);

    expect(screen.getByText(/SOR/)).toBeTruthy();
    expect(screen.getByText(/PRM/)).toBeTruthy();

    fireEvent.click(screen.getByText("Base sets only"));
    expect(screen.queryByText(/PRM/)).toBeNull();
  });
});

// ── CatalogPage integration test ──────────────────────────────────────────

describe("CatalogPage", () => {
  it("does not render old set-logo toggle buttons", async () => {
    const { CatalogPage } = await import("./CatalogPage");
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<CatalogPage />));
    });
    expect(container.querySelector(".set-filter-btn")).toBeNull();
  });

  it("does not render old aspect toggle buttons", async () => {
    const { CatalogPage } = await import("./CatalogPage");
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(<CatalogPage />));
    });
    expect(container.querySelector(".aspect-filter-btn")).toBeNull();
  });

  it("renders the FilterPanel header", async () => {
    const { CatalogPage } = await import("./CatalogPage");
    let getByText!: (text: string) => HTMLElement;
    await act(async () => {
      ({ getByText } = render(<CatalogPage />));
    });
    expect(getByText("Filters")).toBeTruthy();
  });
});
