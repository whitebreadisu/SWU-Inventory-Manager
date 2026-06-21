import React from "react";
import { cardOwnedTotal, isPlaysetComplete, isOwned } from "../../utils/inventory";
import type { InventoryCard } from "../../utils/inventory";

interface Props {
  cards: InventoryCard[];
  children?: React.ReactNode;
}

export function InventorySummary({ cards, children }: Props) {
  // Tokens behave like normal cards at the row level (PlaysetCell still
  // renders their pips) but are excluded from every aggregate here
  // (SWU_Catalog_Redesign_Spec.md §6) so a token pile never distorts the
  // collection-completion picture.
  const nonTokenCards = cards.filter((c) => !c.is_token);
  const total = nonTokenCards.length;
  const playsetCount = nonTokenCards.filter((c) => isPlaysetComplete(c.inventory, c.type)).length;
  const ownedCount = nonTokenCards.filter((c) => isOwned(c.inventory)).length;
  const totalCards = nonTokenCards.reduce((s, c) => s + cardOwnedTotal(c.inventory), 0);

  const pct = (n: number) => (total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`);

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
      {children && <span className="inv-summary__actions">{children}</span>}
    </div>
  );
}
