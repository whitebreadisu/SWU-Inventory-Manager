import React, { useEffect, useState } from 'react';
import { getInventory, incrementCard, decrementCard } from '../../api/inventory';
import { groupWithInventory } from '../../utils/inventory';
import { InventorySummary } from './InventorySummary';
import { InventoryTable } from './InventoryTable';
import type { InventoryCard } from '../../utils/inventory';
import './inventory.css';

export function InventoryPage() {
  const [cards, setCards] = useState<InventoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInventory()
      .then(raw => setCards(groupWithInventory(raw)))
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

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
      <h2 className="screen-heading">Inventory</h2>
      {loading ? (
        <p className="loading-text">Loading inventory…</p>
      ) : (
        <>
          <InventorySummary cards={cards} />
          <InventoryTable
            cards={cards}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
          />
        </>
      )}
    </div>
  );
}
