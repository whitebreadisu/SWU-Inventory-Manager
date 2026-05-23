import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { applyFilters, DEFAULT_FILTERS } from './FilterPanel';
import type { FilterState } from './FilterPanel';
import type { BaseCard } from '../utils/catalog';

// ── Helpers ───────────────────────────────────────────────────────────────

vi.mock('../api/cards', () => ({
  getCards: vi.fn(() => Promise.resolve([])),
}));

function makeCard(overrides: Partial<BaseCard> = {}): BaseCard {
  return {
    set_code: 'SOR',
    base_card_number: '001',
    name: 'Test Unit',
    rarity: 'C',
    type: 'Unit',
    aspects: [],
    keywords: [],
    traits: [],
    cost: null,
    power: null,
    hp: null,
    arena: null,
    hasStandard: true,
    hasFoil: false,
    hasHyperspace: false,
    hasHyperspaceFoil: false,
    hasPrestige: false,
    hasPrestigeFoil: false,
    hasOp: false,
    hasOpFoil: false,
    ...overrides,
  };
}

function withSearch(search: string): FilterState {
  return { ...DEFAULT_FILTERS, aspects: new Set(DEFAULT_FILTERS.aspects), search };
}

// ── applyFilters tests ────────────────────────────────────────────────────

describe('applyFilters', () => {
  it('matches card by name when search term is in the name', () => {
    const cards = [
      makeCard({ name: 'Luke Skywalker' }),
      makeCard({ base_card_number: '002', name: 'Darth Vader' }),
    ];
    const result = applyFilters(cards, withSearch('luke'));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Luke Skywalker');
  });

  it('matches card by subtitle when search term is in the subtitle portion', () => {
    const cards = [
      makeCard({ name: 'Director Krennic - Aspiring to Authority', type: 'Leader' }),
      makeCard({ base_card_number: '002', name: 'Luke Skywalker' }),
    ];
    const result = applyFilters(cards, withSearch('aspiring'));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Director Krennic - Aspiring to Authority');
  });

  it('excludes cards that do not match the search term', () => {
    const cards = [makeCard({ name: 'Han Solo' })];
    const result = applyFilters(cards, withSearch('vader'));
    expect(result).toHaveLength(0);
  });

  it('returns only cards that have the selected variant', () => {
    const standard = makeCard({ base_card_number: '001', hasStandard: true, hasFoil: false });
    const foil     = makeCard({ base_card_number: '002', hasStandard: false, hasFoil: true });
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      aspects: new Set(DEFAULT_FILTERS.aspects),
      variant: new Set(['hasFoil']),
    };
    const result = applyFilters([standard, foil], filters);
    expect(result).toHaveLength(1);
    expect(result[0].base_card_number).toBe('002');
  });

  it('excludes cards outside the cost range', () => {
    const low  = makeCard({ base_card_number: '001', cost: 2 });
    const mid  = makeCard({ base_card_number: '002', cost: 5 });
    const high = makeCard({ base_card_number: '003', cost: 10 });
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      aspects: new Set(DEFAULT_FILTERS.aspects),
      costRange: [3, 7],
    };
    const result = applyFilters([low, mid, high], filters);
    expect(result).toHaveLength(1);
    expect(result[0].base_card_number).toBe('002');
  });

  it('excludes cards with null cost when cost range is narrowed', () => {
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

// ── CatalogPage integration test ──────────────────────────────────────────

describe('CatalogPage', () => {
  it('does not render old set-logo toggle buttons', async () => {
    const { CatalogPage } = await import('./CatalogPage');
    let container!: HTMLElement;
    await act(async () => { ({ container } = render(<CatalogPage />)); });
    expect(container.querySelector('.set-filter-btn')).toBeNull();
  });

  it('does not render old aspect toggle buttons', async () => {
    const { CatalogPage } = await import('./CatalogPage');
    let container!: HTMLElement;
    await act(async () => { ({ container } = render(<CatalogPage />)); });
    expect(container.querySelector('.aspect-filter-btn')).toBeNull();
  });

  it('renders the FilterPanel header', async () => {
    const { CatalogPage } = await import('./CatalogPage');
    let getByText!: (text: string) => HTMLElement;
    await act(async () => { ({ getByText } = render(<CatalogPage />)); });
    expect(getByText('Filters')).toBeTruthy();
  });
});
