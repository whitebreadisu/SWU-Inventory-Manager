import { cardOwnedTotal, PLAYSET_SIZE } from "../../utils/inventory";
import type { InventoryCard } from "../../utils/inventory";

const SINGLETON_TYPES = new Set(["Leader", "Base"]);

interface Props {
  card: InventoryCard;
  onIncrement: (card: InventoryCard, variantId: number) => void;
  onDecrement: (card: InventoryCard, variantId: number) => void;
  pendingCardIds: Set<number>;
}

export function VariantInventory({ card, onIncrement, onDecrement, pendingCardIds }: Props) {
  const isSingleton = SINGLETON_TYPES.has(card.type);
  const totalOwned = cardOwnedTotal(card.inventory);

  return (
    <span className="variant-inv">
      {card.variants.map((v) => {
        const qty = v.quantity;
        const zero = qty === 0;
        const label = v.finish ?? v.variant_type;
        // Leader/Base: each variant is independently capped at 1.
        // Other cards: all variants share the 3-copy cap.
        const chipBlocked = isSingleton ? qty >= 1 : totalOwned >= PLAYSET_SIZE;
        const pending = pendingCardIds.has(v.variant_id);
        return (
          <span
            key={v.variant_id}
            className={`variant-inv__chip${zero ? " variant-inv__chip--zero" : ""}${pending ? " variant-inv__chip--pending" : ""}`}
            title={`${label}: ${qty}`}
          >
            <span className="variant-inv__label">{label}</span>
            <span className="variant-inv__colon">:</span>
            <button
              type="button"
              className="variant-inv__step variant-inv__step--dec"
              onClick={(e) => {
                e.stopPropagation();
                onDecrement(card, v.variant_id);
              }}
              aria-label={`Decrement ${label}`}
              disabled={qty === 0 || pending}
            >
              −
            </button>
            <span className="variant-inv__qty">{qty}</span>
            <button
              type="button"
              className={`variant-inv__step variant-inv__step--inc${chipBlocked ? " variant-inv__step--blocked" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!chipBlocked) onIncrement(card, v.variant_id);
              }}
              aria-label={`Increment ${label}`}
              disabled={chipBlocked || pending}
            >
              +
            </button>
          </span>
        );
      })}
    </span>
  );
}
