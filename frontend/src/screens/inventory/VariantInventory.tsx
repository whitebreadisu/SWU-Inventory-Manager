import { VARIANT_DEFS, cardOwnedTotal, PLAYSET_SIZE } from "../../utils/inventory";
import type { InventoryCard } from "../../utils/inventory";

const SINGLETON_TYPES = new Set(["Leader", "Base"]);

interface Props {
  card: InventoryCard;
  onIncrement: (card: InventoryCard, invKey: string) => void;
  onDecrement: (card: InventoryCard, invKey: string) => void;
  pendingCardIds: Set<number>;
}

export function VariantInventory({ card, onIncrement, onDecrement, pendingCardIds }: Props) {
  const variants = VARIANT_DEFS.filter((v) => card[v.key]);
  const inv = card.inventory;
  const isSingleton = SINGLETON_TYPES.has(card.type);
  const totalOwned = cardOwnedTotal(inv);

  return (
    <span className="variant-inv">
      {variants.map((v) => {
        const qty = inv[v.invKey] ?? 0;
        const zero = qty === 0;
        // Leader/Base: each variant is independently capped at 1.
        // Other cards: all variants share the 3-copy cap.
        const chipBlocked = isSingleton ? qty >= 1 : totalOwned >= PLAYSET_SIZE;
        const cardId = card.cardIds[v.invKey];
        const pending = cardId != null && pendingCardIds.has(cardId);
        return (
          <span
            key={v.invKey}
            className={`variant-inv__chip${zero ? " variant-inv__chip--zero" : ""}${pending ? " variant-inv__chip--pending" : ""}`}
            title={`${v.label}: ${qty}`}
          >
            <span className="variant-inv__label">{v.short}</span>
            <span className="variant-inv__colon">:</span>
            <button
              type="button"
              className="variant-inv__step variant-inv__step--dec"
              onClick={(e) => {
                e.stopPropagation();
                onDecrement(card, v.invKey);
              }}
              aria-label={`Decrement ${v.label}`}
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
                if (!chipBlocked) onIncrement(card, v.invKey);
              }}
              aria-label={`Increment ${v.label}`}
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
