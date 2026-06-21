import type { BaseCard } from "../utils/catalog";

interface Props {
  card: BaseCard;
}

// Simple deterministic color assignment per finish label. This circle UX is
// a placeholder slated for replacement by the popup-based variant picker
// (see SWU_Catalog_Redesign_Spec.md §5.3) — kept minimal intentionally.
const FINISH_COLORS: Record<string, { color: string; solid: boolean }> = {
  Standard: { color: "#6b7280", solid: true },
  "Standard Foil": { color: "#9ca3af", solid: false },
  Hyperspace: { color: "#2563eb", solid: true },
  "Hyperspace Foil": { color: "#60a5fa", solid: false },
  "Standard Prestige": { color: "#d97706", solid: true },
  "Foil Prestige": { color: "#fbbf24", solid: false },
  "Serialized Prestige": { color: "#f59e0b", solid: false },
  Showcase: { color: "#7c3aed", solid: true },
};

const DEFAULT_COLOR = { color: "#dc2626", solid: true };

export function VariantCircles({ card }: Props) {
  return (
    <span className="variant-circles">
      {card.variants.map((variant) => {
        const label = variant.finish ?? variant.variant_type;
        const { color, solid } = FINISH_COLORS[label] ?? DEFAULT_COLOR;
        return (
          <span
            key={variant.variant_id}
            className="variant-circle"
            title={`${label} – ${variant.card_number} – ${variant.source_set_code}`}
            style={{
              background: solid ? color : "transparent",
              border: `2px solid ${color}`,
            }}
          />
        );
      })}
    </span>
  );
}
