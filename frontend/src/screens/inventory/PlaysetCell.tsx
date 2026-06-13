import { cardOwnedTotal, getPlaysetSize } from '../../utils/inventory';
import type { InventoryCard } from '../../utils/inventory';

interface Props {
  card: InventoryCard;
}

export function PlaysetCell({ card }: Props) {
  const owned = cardOwnedTotal(card.inventory);
  const playsetSize = getPlaysetSize(card.type);

  if (playsetSize === 1) {
    const complete = owned >= 1;
    return (
      <span
        className={`playset${complete ? ' playset--complete' : ''}${owned === 0 ? ' playset--empty' : ''}`}
      >
        <span className="playset__pips">
          <span className={`playset__pip${complete ? ' playset__pip--filled' : ''}`} />
        </span>
        {owned >= 2 && <span className="playset__label">{owned}</span>}
      </span>
    );
  }

  const filled = Math.min(playsetSize, owned);
  const complete = filled >= playsetSize;

  return (
    <span
      className={`playset${complete ? ' playset--complete' : ''}${owned === 0 ? ' playset--empty' : ''}`}
    >
      <span className="playset__pips">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className={`playset__pip${i < filled ? ' playset__pip--filled' : ''}`}
          />
        ))}
      </span>
      {owned >= 4 && <span className="playset__label">{owned}</span>}
    </span>
  );
}
