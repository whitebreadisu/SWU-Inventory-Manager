import type { BaseCard } from '../utils/catalog';

type VariantKey = 'hasStandard' | 'hasFoil' | 'hasHyperspace' | 'hasHyperspaceFoil' | 'hasPrestige' | 'hasPrestigeFoil' | 'hasOp' | 'hasOpFoil';

interface Props {
  card: BaseCard;
}

const VARIANTS: { key: VariantKey; label: string; color: string; solid: boolean }[] = [
  { key: 'hasStandard',      label: 'Standard',        color: '#6b7280', solid: true  },
  { key: 'hasFoil',          label: 'Foil',             color: '#9ca3af', solid: false },
  { key: 'hasHyperspace',    label: 'Hyperspace',       color: '#2563eb', solid: true  },
  { key: 'hasHyperspaceFoil',label: 'Hyperspace Foil',  color: '#60a5fa', solid: false },
  { key: 'hasPrestige',      label: 'Prestige',         color: '#d97706', solid: true  },
  { key: 'hasPrestigeFoil',  label: 'Prestige Foil',    color: '#fbbf24', solid: false },
  { key: 'hasOp',            label: 'OP',               color: '#dc2626', solid: true  },
  { key: 'hasOpFoil',        label: 'OP Foil',          color: '#f87171', solid: false },
];

export function VariantCircles({ card }: Props) {
  return (
    <span className="variant-circles">
      {VARIANTS.map(({ key, label, color, solid }) =>
        card[key] ? (
          <span
            key={key}
            className="variant-circle"
            title={label}
            style={{
              background: solid ? color : 'transparent',
              border: `2px solid ${color}`,
            }}
          />
        ) : null
      )}
    </span>
  );
}
