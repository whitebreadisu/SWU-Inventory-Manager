import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventoryPage } from "./InventoryPage";
import type { CardWithQty } from "../../api/inventory";
import type { BaseCardDetail } from "../../api/baseCards";

vi.mock("../../api/sets", () => ({
  getSets: vi.fn().mockResolvedValue([
    {
      id: 1,
      code: "SOR",
      name: "Spark of Rebellion",
      is_base_set: true,
      release_date: "2024-03-08",
    },
    {
      id: 2,
      code: "SHD",
      name: "Shadows of the Galaxy",
      is_base_set: true,
      release_date: "2024-08-02",
    },
  ]),
}));

const mockGetInventory = vi.fn();
const mockIncrementCard = vi.fn();
const mockDecrementCard = vi.fn();
vi.mock("../../api/inventory", () => ({
  getInventory: () => mockGetInventory(),
  incrementCard: (variantId: number) => mockIncrementCard(variantId),
  decrementCard: (variantId: number) => mockDecrementCard(variantId),
}));

const mockGetBaseCardDetail = vi.fn();
vi.mock("../../api/baseCards", () => ({
  getBaseCardDetail: (id: number) => mockGetBaseCardDetail(id),
}));

function makeCard(overrides: Partial<CardWithQty>): CardWithQty {
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
    swuapi_id: "uuid-1",
    front_image_url: null,
    back_image_url: null,
    stamp_group: null,
    aspects: [],
    keywords: [],
    traits: [],
    cost: 1,
    power: 1,
    hp: 1,
    arena: "Ground",
    quantity: 0,
    ...overrides,
  };
}

function makeBaseCardDetail(overrides: Partial<BaseCardDetail> = {}): BaseCardDetail {
  return {
    id: 1,
    set_code: "SOR",
    set_name: "Spark of Rebellion",
    base_card_number: "1",
    name: "SOR Card One",
    subtitle: null,
    type: "Unit",
    type2: null,
    double_sided: false,
    rarity: "C",
    cost: 1,
    power: 1,
    hp: 1,
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
    variants: [
      {
        variant_id: 1,
        variant_type: "Standard",
        finish: "Standard",
        channel: "Retail",
        stamped: false,
        source_set_code: "SOR",
        source_set_name: "Spark of Rebellion",
        card_number: "1",
        front_image_url: null,
        back_image_url: null,
        stamp_group: null,
        quantity: 3,
      },
    ],
    ...overrides,
  };
}

// 4 unique base cards: 2 in SOR (one playset-complete), 2 in SHD (one partially owned).
const mockInventory: CardWithQty[] = [
  makeCard({
    id: 1,
    base_card_id: 1,
    set_id: 1,
    set_code: "SOR",
    base_card_number: "1",
    card_number: "1",
    name: "SOR Card One",
    quantity: 3,
  }),
  makeCard({
    id: 2,
    base_card_id: 2,
    set_id: 1,
    set_code: "SOR",
    base_card_number: "2",
    card_number: "2",
    name: "SOR Card Two",
    quantity: 0,
  }),
  makeCard({
    id: 3,
    base_card_id: 3,
    set_id: 2,
    set_code: "SHD",
    base_card_number: "1",
    card_number: "1",
    source_set_code: "SHD",
    name: "SHD Card One",
    quantity: 1,
  }),
  makeCard({
    id: 4,
    base_card_id: 4,
    set_id: 2,
    set_code: "SHD",
    base_card_number: "2",
    card_number: "2",
    source_set_code: "SHD",
    name: "SHD Card Two",
    quantity: 0,
  }),
];

async function renderPage() {
  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(<InventoryPage />);
  });
  return utils;
}

function summaryValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".inv-summary__value")).map(
    (el) => el.textContent ?? ""
  );
}

function summarySub(container: HTMLElement): string {
  return container.querySelector(".inv-summary__sub")?.textContent ?? "";
}

function expandFilters() {
  fireEvent.click(screen.getByRole("button", { name: /filters/i }));
}

describe("InventoryPage summary stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInventory.mockResolvedValue(mockInventory);
  });

  it("reflects combined totals across all sets before filtering", async () => {
    const { container } = await renderPage();
    expect(summaryValues(container)).toEqual(["25%", "50%", "4"]);
    expect(summarySub(container)).toBe("(2 unique)");
  });

  it("updates stats when the Set filter narrows to one set", async () => {
    const { container } = await renderPage();
    expandFilters();

    const setButton = screen.getByText("All sets").closest("button")!;
    fireEvent.click(setButton);
    fireEvent.click(screen.getByRole("option", { name: "SOR — Spark of Rebellion" }));

    expect(summaryValues(container)).toEqual(["50%", "50%", "3"]);
    expect(summarySub(container)).toBe("(1 unique)");
  });

  it('updates stats when "Show only incomplete playsets" is toggled on', async () => {
    const { container } = await renderPage();
    expandFilters();

    fireEvent.click(screen.getByRole("button", { name: /show only incomplete playsets/i }));

    expect(summaryValues(container)).toEqual(["0%", "33%", "1"]);
    expect(summarySub(container)).toBe("(1 unique)");
  });
});

// DISPOSITION (RETIRE): the old "InventoryPage in-flight guard (P7 stage 2)"
// suite tested the inline +/- chip steppers (handleIncrement/handleDecrement,
// pendingCardIds) directly on InventoryPage. The locked redesign decision
// removes inline editing entirely -- inventory is now read-only at the row
// level, and all quantity changes happen inside CardInventoryPopup (which
// has its own in-flight guard coverage in CardInventoryPopup.test.tsx). The
// behavior these tests guarded (double-click-while-pending dedup) survives,
// just relocated to the popup; it is not lost, only moved. See the suite
// below for the popup-wiring coverage that supersedes this one.
describe("InventoryPage popup wiring (Inventory tab redesign)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInventory.mockResolvedValue(mockInventory);
    mockGetBaseCardDetail.mockResolvedValue(makeBaseCardDetail());
  });

  it("clicking a card name opens CardDetailPopup for that base card", async () => {
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: "SOR Card One" }));

    await act(async () => {});
    expect(mockGetBaseCardDetail).toHaveBeenCalledWith(1);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("clicking the inventory cell opens CardInventoryPopup for that base card", async () => {
    await renderPage();

    const row = screen.getByText("SOR Card Two").closest("tr")!;
    fireEvent.click(row.querySelector(".td-inventory")!);

    await act(async () => {});
    expect(mockGetBaseCardDetail).toHaveBeenCalledWith(2);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("re-fetches inventory when the inventory popup reports a change and closes", async () => {
    mockGetBaseCardDetail.mockResolvedValue(
      makeBaseCardDetail({
        variants: [
          {
            variant_id: 1,
            variant_type: "Standard",
            finish: "Standard",
            channel: "Retail",
            stamped: false,
            source_set_code: "SOR",
            source_set_name: "Spark of Rebellion",
            card_number: "1",
            front_image_url: null,
            back_image_url: null,
            stamp_group: null,
            quantity: 0,
          },
        ],
      })
    );
    mockIncrementCard.mockResolvedValue({
      variant_id: 1,
      quantity: 1,
      playset_complete: false,
      blocked: false,
      reason: null,
    });

    await renderPage();
    expect(mockGetInventory).toHaveBeenCalledTimes(1);

    const row = screen.getByText("SOR Card Two").closest("tr")!;
    fireEvent.click(row.querySelector(".td-inventory")!);
    await act(async () => {});

    // Simulate the popup incrementing a variant (changed=true), then closing.
    const incButton = screen.getByRole("button", { name: /increment/i });
    fireEvent.click(incButton);
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await act(async () => {});

    expect(mockGetInventory).toHaveBeenCalledTimes(2);
  });
});
