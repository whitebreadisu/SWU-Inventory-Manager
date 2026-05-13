import type { Card } from '../api/cards';
import { getVariantLabel, getRarityLabel } from '../utils/variants';

interface Props {
  cards: Card[];
}

export function CardTable({ cards }: Props) {
  if (cards.length === 0) {
    return <p>No cards found.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Variant</th>
          <th>Rarity</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        {cards.map(card => (
          <tr key={card.id}>
            <td>{card.card_number}</td>
            <td>{card.name}</td>
            <td>{getVariantLabel(card)}</td>
            <td>{getRarityLabel(card.rarity)}</td>
            <td>{card.type}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
