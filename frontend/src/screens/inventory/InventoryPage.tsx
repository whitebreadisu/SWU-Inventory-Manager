import React, { useEffect, useState, useMemo } from 'react';
import { getInventory, incrementCard, decrementCard } from '../../api/inventory';
import { groupWithInventory, isPlaysetComplete } from '../../utils/inventory';
import { InventorySummary } from './InventorySummary';
import { InventoryTable } from './InventoryTable';
import { FilterPanel, applyFilters, DEFAULT_FILTERS } from '../../components/FilterPanel';
import { SWUButton } from '../../components/SWUButton';
import type { InventoryCard } from '../../utils/inventory';
import type { FilterState } from '../../components/FilterPanel';
import type { BaseCard } from '../../utils/catalog';
import './inventory.css';

export function InventoryPage() {
  const [cards, setCards] = useState<InventoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [incompleteOnly, setIncompleteOnly] = useState(false);

  useEffect(() => {
    getInventory()
      .then(raw => setCards(groupWithInventory(raw)))
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = applyFilters(cards as BaseCard[], filters) as InventoryCard[];
    if (incompleteOnly) result = result.filter(c => !isPlaysetComplete(c.inventory, c.type));
    return result;
  }, [cards, filters, incompleteOnly]);

  async function handleIncrement(card: InventoryCard, invKey: string) {
    const cardId = card.cardIds[invKey];
    if (cardId == null) return;
    try {
      const result = await incrementCard(cardId);
      if (result.blocked) return;
      setCards(prev =>
        prev.map(c =>
          c.set_code === card.set_code && c.base_card_number === card.base_card_number
            ? { ...c, inventory: { ...c.inventory, [invKey]: result.quantity } }
            : c,
        ),
      );
    } catch (err) {
      console.error('Increment failed:', err);
    }
  }

  async function handleDecrement(card: InventoryCard, invKey: string) {
    const cardId = card.cardIds[invKey];
    if (cardId == null) return;
    try {
      const result = await decrementCard(cardId);
      setCards(prev =>
        prev.map(c =>
          c.set_code === card.set_code && c.base_card_number === card.base_card_number
            ? { ...c, inventory: { ...c.inventory, [invKey]: result.quantity } }
            : c,
        ),
      );
    } catch (err) {
      console.error('Decrement failed:', err);
    }
  }

  if (error) return <p className="loading-text">Error: {error}</p>;

  return (
    <div className="screen">
      {loading ? (
        <p className="loading-text">Loading inventory…</p>
      ) : (
        <>
          <InventorySummary cards={cards}>
            <SWUButton size="sm">Add Cards</SWUButton>
          </InventorySummary>
          <FilterPanel filters={filters} setFilters={setFilters} cards={cards as BaseCard[]}>
            <div className="ifp-toggle-row">
              <button
                type="button"
                className={`pl-toggle${incompleteOnly ? ' pl-toggle--on' : ''}`}
                onClick={() => setIncompleteOnly(v => !v)}
                aria-pressed={incompleteOnly}
              >
                <span className="pl-toggle__box" />
                <span className="pl-toggle__label">Show only incomplete playsets</span>
              </button>
            </div>
          </FilterPanel>
          <InventoryTable
            cards={filtered}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
          />
        </>
      )}
    </div>
  );
}
