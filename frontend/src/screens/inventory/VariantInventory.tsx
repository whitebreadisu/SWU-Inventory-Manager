import type { InventoryCard } from "../../utils/inventory";

interface Props {
  card: InventoryCard;
}

/** Read-only owned-variants display (Inventory tab redesign): editing now
 * happens only in CardInventoryPopup. Shows only variants with quantity > 0,
 * each as a readable "Label: N" entry (no abbreviation vocabulary); a muted
 * "—" when nothing is owned. */
export function VariantInventory({ card }: Props) {
  const owned = card.variants.filter((v) => v.quantity > 0);

  if (owned.length === 0) {
    return <span className="cell-muted">—</span>;
  }

  return (
    <span className="variant-inv">
      {owned.map((v, i) => {
        const label = v.finish ?? v.variant_type;
        return (
          <span key={v.variant_id} className="variant-inv__chip">
            {i > 0 && <span className="variant-inv__sep">·</span>}
            <span className="variant-inv__label">{label}</span>
            <span className="variant-inv__colon">:</span>
            <span className="variant-inv__qty">{v.quantity}</span>
          </span>
        );
      })}
    </span>
  );
}
