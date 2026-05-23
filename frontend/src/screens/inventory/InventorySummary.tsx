import React from 'react';
import { cardOwnedTotal, isPlaysetComplete, isOwned } from '../../utils/inventory';
import type { InventoryCard } from '../../utils/inventory';

interface Props {
  cards: InventoryCard[];
}

export function InventorySummary({ cards }: Props) {
  const total = cards.length;
  const playsetCount = cards.filter(c => isPlaysetComplete(c.inventory, c.type)).length;
  const ownedCount = cards.filter(c => isOwned(c.inventory)).length;
  const totalCards = cards.reduce((s, c) => s + cardOwnedTotal(c.inventory), 0);

  const pct = (n: number) =>
    total === 0 ? '0%' : `${Math.round((n / total) * 100)}%`;

  return (
    <div className="inv-summary">
      <span className="inv-summary__metric">
        <span className="inv-summary__label">Playset complete:</span>
        <span className="inv-summary__value">{pct(playsetCount)}</span>
      </span>
      <span className="inv-summary__sep">—</span>
      <span className="inv-summary__metric">
        <span className="inv-summary__label">Set complete:</span>
        <span className="inv-summary__value">{pct(ownedCount)}</span>
      </span>
      <span className="inv-summary__sep">—</span>
      <span className="inv-summary__metric">
        <span className="inv-summary__value">{totalCards.toLocaleString()}</span>
        <span className="inv-summary__label">cards</span>
        <span className="inv-summary__sub">({ownedCount.toLocaleString()} unique)</span>
      </span>
    </div>
  );
}
