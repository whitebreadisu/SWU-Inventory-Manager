import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryPage } from './InventoryPage';
import type { CardWithQty } from '../../api/inventory';

vi.mock('../../api/sets', () => ({
  getSets: vi.fn().mockResolvedValue([]),
}));

const mockGetInventory = vi.fn();
vi.mock('../../api/inventory', () => ({
  getInventory: () => mockGetInventory(),
  incrementCard: vi.fn(),
  decrementCard: vi.fn(),
}));

function makeCard(overrides: Partial<CardWithQty>): CardWithQty {
  return {
    id: 1, set_id: 1, set_code: 'SOR', base_card_number: '1', card_number: '1',
    name: 'Card', rarity: 'C', type: 'Unit', is_foil: false, is_hyperspace: false,
    is_prestige: false, is_showcase: false, is_organized_play: false,
    aspects: [], keywords: [], traits: [], cost: 1, power: 1, hp: 1, arena: 'Ground',
    quantity: 0,
    ...overrides,
  };
}

// 4 unique cards: 2 in SOR (one playset-complete), 2 in SHD (one partially owned).
const mockInventory: CardWithQty[] = [
  makeCard({ id: 1, set_id: 1, set_code: 'SOR', base_card_number: '1', card_number: '1', name: 'SOR Card One', quantity: 3 }),
  makeCard({ id: 2, set_id: 1, set_code: 'SOR', base_card_number: '2', card_number: '2', name: 'SOR Card Two', quantity: 0 }),
  makeCard({ id: 3, set_id: 2, set_code: 'SHD', base_card_number: '1', card_number: '1', name: 'SHD Card One', quantity: 1 }),
  makeCard({ id: 4, set_id: 2, set_code: 'SHD', base_card_number: '2', card_number: '2', name: 'SHD Card Two', quantity: 0 }),
];

async function renderPage() {
  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(<InventoryPage />);
  });
  return utils;
}

function summaryValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.inv-summary__value')).map(el => el.textContent ?? '');
}

function summarySub(container: HTMLElement): string {
  return container.querySelector('.inv-summary__sub')?.textContent ?? '';
}

function expandFilters() {
  fireEvent.click(screen.getByRole('button', { name: /filters/i }));
}

describe('InventoryPage summary stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInventory.mockResolvedValue(mockInventory);
  });

  it('reflects combined totals across all sets before filtering', async () => {
    const { container } = await renderPage();
    expect(summaryValues(container)).toEqual(['25%', '50%', '4']);
    expect(summarySub(container)).toBe('(2 unique)');
  });

  it('updates stats when the Set filter narrows to one set', async () => {
    const { container } = await renderPage();
    expandFilters();

    const setButton = screen.getByText('All sets').closest('button')!;
    fireEvent.click(setButton);
    fireEvent.click(screen.getByRole('option', { name: 'SOR — Spark of Rebellion' }));

    expect(summaryValues(container)).toEqual(['50%', '50%', '3']);
    expect(summarySub(container)).toBe('(1 unique)');
  });

  it('updates stats when "Show only incomplete playsets" is toggled on', async () => {
    const { container } = await renderPage();
    expandFilters();

    fireEvent.click(screen.getByRole('button', { name: /show only incomplete playsets/i }));

    expect(summaryValues(container)).toEqual(['0%', '33%', '1']);
    expect(summarySub(container)).toBe('(1 unique)');
  });
});
