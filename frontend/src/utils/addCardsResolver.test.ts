import { describe, it, expect } from 'vitest';
import {
  resolveRow,
  inventoryStatus,
  splitForVerification,
  variantLabelNoOp,
  maxCopies,
} from './addCardsResolver';
import type { CardWithQty } from '../api/inventory';
import type { Row } from './addCardsResolver';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCard(overrides: Partial<CardWithQty>): CardWithQty {
  return {
    id: 1,
    set_id: 1,
    set_code: 'SOR',
    base_card_number: '1',
    card_number: '1',
    name: 'Test Card',
    rarity: 'C',
    type: 'Unit',
    is_foil: false,
    is_hyperspace: false,
    is_prestige: false,
    is_showcase: false,
    is_organized_play: false,
    aspects: [],
    keywords: [],
    traits: [],
    cost: 3,
    power: 2,
    hp: 3,
    arena: 'Ground',
    quantity: 0,
    ...overrides,
  };
}

function makeRow(overrides: Partial<Row> = {}): Row {
  return { id: 'test', cardNumber: '1', op: false, variant: null, ...overrides };
}

// ─── Test catalog ────────────────────────────────────────────────────────────

// SOR: has_unique_variant_numbers = false
// card #1: Standard + Foil + OP Standard
const sorStandard = makeCard({ id: 1, set_code: 'SOR', base_card_number: '1', card_number: '1', type: 'Unit', quantity: 0 });
const sorFoil     = makeCard({ id: 2, set_code: 'SOR', base_card_number: '1', card_number: '1', type: 'Unit', is_foil: true, quantity: 2 });
const sorOp       = makeCard({ id: 3, set_code: 'SOR', base_card_number: '1', card_number: '1', type: 'Unit', is_organized_play: true, quantity: 0 });

// SOR: card #10: Leader Standard (max 1)
const sorLeader   = makeCard({ id: 10, set_code: 'SOR', base_card_number: '10', card_number: '10', type: 'Leader', name: 'Luke Skywalker - Faithful Friend', quantity: 1 });

// JTL: has_unique_variant_numbers = true
// card #12: Standard only
const jtlStandard = makeCard({ id: 20, set_code: 'JTL', base_card_number: '12', card_number: '12', type: 'Unit', quantity: 0 });
// card #58: Foil of the same base card (separate base_card_number in JTL)
const jtlFoil     = makeCard({ id: 21, set_code: 'JTL', base_card_number: '58', card_number: '58', type: 'Unit', is_foil: true, quantity: 0 });
// JTL card #54: OP Standard (unique variant numbers, OP has a unique number too)
const jtlOp       = makeCard({ id: 22, set_code: 'JTL', base_card_number: '54', card_number: '54', type: 'Unit', is_organized_play: true, quantity: 0 });

const catalog: CardWithQty[] = [sorStandard, sorFoil, sorOp, sorLeader, jtlStandard, jtlFoil, jtlOp];

// ─── variantLabelNoOp ────────────────────────────────────────────────────────

describe('variantLabelNoOp', () => {
  it('returns Standard for a plain card', () => {
    expect(variantLabelNoOp(sorStandard)).toBe('Standard');
  });
  it('returns Foil for a foil card', () => {
    expect(variantLabelNoOp(sorFoil)).toBe('Foil');
  });
  it('excludes OP from the label', () => {
    expect(variantLabelNoOp(sorOp)).toBe('Standard');
  });
  it('returns Hyperspace Foil for hyperspace + foil', () => {
    const card = makeCard({ is_hyperspace: true, is_foil: true });
    expect(variantLabelNoOp(card)).toBe('Hyperspace Foil');
  });
});

// ─── maxCopies ───────────────────────────────────────────────────────────────

describe('maxCopies', () => {
  it('returns 1 for Leader', () => expect(maxCopies('Leader')).toBe(1));
  it('returns 1 for Base',   () => expect(maxCopies('Base')).toBe(1));
  it('returns 3 for Unit',   () => expect(maxCopies('Unit')).toBe(3));
  it('returns 3 for Event',  () => expect(maxCopies('Event')).toBe(3));
});

// ─── resolveRow ─────────────────────────────────────────────────────────────

describe('resolveRow', () => {
  it('returns empty when cardNumber is blank', () => {
    const result = resolveRow('SOR', makeRow({ cardNumber: '' }), catalog, false);
    expect(result.status).toBe('empty');
  });

  it('returns error for an invalid card number', () => {
    const result = resolveRow('SOR', makeRow({ cardNumber: '999' }), catalog, false);
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toMatch(/not valid/i);
    }
  });

  it('returns needs_variant for non-unique set with multiple matches (no variant picked)', () => {
    const result = resolveRow('SOR', makeRow({ cardNumber: '1', variant: null }), catalog, false);
    expect(result.status).toBe('needs_variant');
    if (result.status === 'needs_variant') {
      expect(result.variants).toContain('Standard');
      expect(result.variants).toContain('Foil');
    }
  });

  it('resolves when variant is picked on a non-unique set', () => {
    const result = resolveRow('SOR', makeRow({ cardNumber: '1', variant: 'Foil' }), catalog, false);
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.cardId).toBe(sorFoil.id);
      expect(result.variant).toBe('Foil');
      expect(result.isOp).toBe(false);
      expect(result.hasOpOption).toBe(true);
    }
  });

  it('auto-resolves for a unique-variant-numbers set with one match', () => {
    const result = resolveRow('JTL', makeRow({ cardNumber: '12' }), catalog, true);
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.cardId).toBe(jtlStandard.id);
      expect(result.variant).toBe('Standard');
    }
  });

  it('resolves to OP card when op=true and OP printing exists', () => {
    const result = resolveRow('SOR', makeRow({ cardNumber: '1', op: true, variant: 'Standard' }), catalog, false);
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.cardId).toBe(sorOp.id);
      expect(result.isOp).toBe(true);
    }
  });

  it('returns error when op=true but no OP printing exists for the card', () => {
    const result = resolveRow('JTL', makeRow({ cardNumber: '12', op: true }), catalog, true);
    expect(result.status).toBe('error');
  });

  it('parses name/subtitle from hyphen-split card name', () => {
    const result = resolveRow('SOR', makeRow({ cardNumber: '10' }), catalog, false);
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.name).toBe('Luke Skywalker');
      expect(result.subtitle).toBe('Faithful Friend');
    }
  });

  it('returns hasOpOption=false when no OP printing exists', () => {
    const result = resolveRow('JTL', makeRow({ cardNumber: '12' }), catalog, true);
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.hasOpOption).toBe(false);
    }
  });
});

// ─── inventoryStatus ─────────────────────────────────────────────────────────

describe('inventoryStatus', () => {
  it('returns green when owned + pending is under max', () => {
    // sorFoil has quantity=2, max=3. Adding 1 would be 3, which is not > max.
    const row = makeRow({ cardNumber: '1', variant: 'Foil' });
    const rows = [row];
    const resolved = resolveRow('SOR', row, catalog, false);
    expect(resolved.status).toBe('resolved');
    if (resolved.status !== 'resolved') return;
    const status = inventoryStatus('SOR', rows, row, resolved, catalog, false);
    expect(status.color).toBe('green');
    expect(status.owned).toBe(2);
    expect(status.max).toBe(3);
  });

  it('returns red when owned + pending exceeds max', () => {
    // sorFoil has quantity=2, max=3. Two pending rows for same card → 2+2=4 > 3.
    const row1 = makeRow({ id: 'r1', cardNumber: '1', variant: 'Foil' });
    const row2 = makeRow({ id: 'r2', cardNumber: '1', variant: 'Foil' });
    const rows = [row1, row2];
    const resolved = resolveRow('SOR', row2, catalog, false);
    expect(resolved.status).toBe('resolved');
    if (resolved.status !== 'resolved') return;
    const status = inventoryStatus('SOR', rows, row2, resolved, catalog, false);
    expect(status.color).toBe('red');
  });

  it('counts only rows up to and including the current row (not later rows)', () => {
    // row1 makes owned+1=1, still under max=3 → green
    const row1 = makeRow({ id: 'r1', cardNumber: '1', variant: 'Standard' });
    const row2 = makeRow({ id: 'r2', cardNumber: '1', variant: 'Standard' });
    const row3 = makeRow({ id: 'r3', cardNumber: '1', variant: 'Standard' });
    const rows = [row1, row2, row3];
    const resolved = resolveRow('SOR', row1, catalog, false);
    expect(resolved.status).toBe('resolved');
    if (resolved.status !== 'resolved') return;
    // row1 has pending=1 (itself), owned=0, wouldBe=1 ≤ 3 → green
    const status1 = inventoryStatus('SOR', rows, row1, resolved, catalog, false);
    expect(status1.color).toBe('green');
    // row3 has pending=3 (r1+r2+r3), owned=0, wouldBe=3 ≤ 3 → green
    const status3 = inventoryStatus('SOR', rows, row3, resolved, catalog, false);
    expect(status3.color).toBe('green');
  });

  it('returns red for Leader at limit (max=1)', () => {
    // sorLeader has quantity=1, max=1
    const row = makeRow({ cardNumber: '10' });
    const rows = [row];
    const resolved = resolveRow('SOR', row, catalog, false);
    expect(resolved.status).toBe('resolved');
    if (resolved.status !== 'resolved') return;
    const status = inventoryStatus('SOR', rows, row, resolved, catalog, false);
    expect(status.color).toBe('red');
    expect(status.max).toBe(1);
  });
});

// ─── splitForVerification ────────────────────────────────────────────────────

describe('splitForVerification', () => {
  it('puts green rows in willAdd and red rows in willSkip', () => {
    // sorFoil quantity=2, adding 1→3: green
    const rowFoil = makeRow({ id: 'f', cardNumber: '1', variant: 'Foil' });
    // sorLeader quantity=1, adding 1→2: red (over max=1)
    const rowLeader = makeRow({ id: 'l', cardNumber: '10' });
    const rows = [rowFoil, rowLeader];

    const { willAdd, willSkip } = splitForVerification('SOR', rows, catalog, false);
    expect(willAdd.some(x => x.row.id === 'f')).toBe(true);
    expect(willSkip.some(x => x.row.id === 'l')).toBe(true);
  });

  it('ignores empty and unresolved rows', () => {
    const rowEmpty = makeRow({ id: 'e', cardNumber: '' });
    const rowError = makeRow({ id: 'x', cardNumber: '999' });
    const rows = [rowEmpty, rowError];

    const { willAdd, willSkip } = splitForVerification('SOR', rows, catalog, false);
    expect(willAdd).toHaveLength(0);
    expect(willSkip).toHaveLength(0);
  });
});
