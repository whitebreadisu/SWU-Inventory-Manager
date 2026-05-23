import React from 'react';
import { parseCardDisplay } from '../../utils/catalog';
import { getRarityLabel } from '../../utils/variants';
import { AspectIcon } from '../../components/AspectIcon';
import { VariantInventory } from './VariantInventory';
import { PlaysetCell } from './PlaysetCell';
import type { InventoryCard } from '../../utils/inventory';

const ASPECTS = ['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy'] as const;

interface Props {
  cards: InventoryCard[];
  onIncrement: (card: InventoryCard, invKey: string) => void;
  onDecrement: (card: InventoryCard, invKey: string) => void;
}

export function InventoryTable({ cards, onIncrement, onDecrement }: Props) {
  if (cards.length === 0) {
    return <p className="placeholder">No cards match the current filters.</p>;
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table data-table--inventory">
        <thead>
          <tr>
            <th>Name</th>
            <th className="th-inventory">Inventory</th>
            <th>Playset</th>
            <th>Rarity</th>
            <th>Aspect</th>
            <th>Type</th>
            <th>Cost</th>
            <th>Power</th>
            <th>HP</th>
            <th>Trait</th>
            <th>Keyword</th>
            <th>Arena</th>
            <th>Set</th>
          </tr>
        </thead>
        <tbody>
          {cards.map(card => {
            const { displayName, subtitle } = parseCardDisplay(card);
            const isBase = card.type === 'Base';
            return (
              <tr key={`${card.set_code}-${card.base_card_number}`}>
                <td className="td-name">
                  {displayName}
                  {subtitle && <span className="card-subtitle">{subtitle}</span>}
                </td>
                <td className="td-inventory">
                  <VariantInventory
                    card={card}
                    onIncrement={onIncrement}
                    onDecrement={onDecrement}
                  />
                </td>
                <td className="td-playset">
                  <PlaysetCell card={card} />
                </td>
                <td>{getRarityLabel(card.rarity)}</td>
                <td>
                  <span className="aspect-cell">
                    {card.aspects
                      .slice()
                      .sort((a, b) => ASPECTS.indexOf(a as typeof ASPECTS[number]) - ASPECTS.indexOf(b as typeof ASPECTS[number]))
                      .map(a => <AspectIcon key={a} aspect={a} size={16} />)}
                    {card.aspects.length === 0 && <span className="cell-muted">—</span>}
                  </span>
                </td>
                <td>{card.type}</td>
                <td className={card.cost == null ? 'cell-muted' : ''}>{card.cost ?? '—'}</td>
                <td className={card.power == null ? 'cell-muted' : ''}>{card.power ?? '—'}</td>
                <td className={card.hp == null ? 'cell-muted' : ''}>{card.hp ?? '—'}</td>
                <td className={isBase || card.traits.length === 0 ? 'cell-muted' : ''}>
                  {isBase ? (card.traits[0] ?? '—') : (card.traits.join(', ') || '—')}
                </td>
                <td className={card.keywords.length === 0 ? 'cell-muted' : ''}>
                  {card.keywords.join(', ') || '—'}
                </td>
                <td className={card.arena == null ? 'cell-muted' : ''}>{card.arena ?? '—'}</td>
                <td className="cell-muted">{card.set_code}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
