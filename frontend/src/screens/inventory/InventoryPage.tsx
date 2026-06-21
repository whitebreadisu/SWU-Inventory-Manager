import { useEffect, useState, useMemo, useCallback } from "react";
import { getInventory, incrementCard, decrementCard } from "../../api/inventory";
import { groupWithInventory, isPlaysetComplete } from "../../utils/inventory";
import { InventorySummary } from "./InventorySummary";
import { InventoryTable } from "./InventoryTable";
import { FilterPanel, applyFilters, DEFAULT_FILTERS } from "../../components/FilterPanel";
import { SWUButton } from "../../components/SWUButton";
import { AddCardsModal } from "./AddCardsModal";
import type { InventoryCard } from "../../utils/inventory";
import type { CardWithQty } from "../../api/inventory";
import type { FilterState } from "../../components/FilterPanel";
import type { BaseCard } from "../../utils/catalog";
import "./inventory.css";

export function InventoryPage() {
  const [rawCards, setRawCards] = useState<CardWithQty[]>([]);
  const [cards, setCards] = useState<InventoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingCardIds, setPendingCardIds] = useState<Set<number>>(new Set());

  const fetchInventory = useCallback(async () => {
    const raw = await getInventory();
    setRawCards(raw);
    setCards(groupWithInventory(raw));
  }, []);

  useEffect(() => {
    fetchInventory()
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [fetchInventory]);

  const filtered = useMemo(() => {
    let result = applyFilters(cards as BaseCard[], filters) as InventoryCard[];
    if (incompleteOnly) result = result.filter((c) => !isPlaysetComplete(c.inventory, c.type));
    return result;
  }, [cards, filters, incompleteOnly]);

  async function handleIncrement(card: InventoryCard, variantId: number) {
    if (pendingCardIds.has(variantId)) return;
    setPendingCardIds((prev) => new Set(prev).add(variantId));
    try {
      const result = await incrementCard(variantId);
      if (result.blocked) return;
      setCards((prev) =>
        prev.map((c) =>
          c.base_card_id === card.base_card_id
            ? {
                ...c,
                inventory: { ...c.inventory, [variantId]: result.quantity },
                variants: c.variants.map((v) =>
                  v.variant_id === variantId ? { ...v, quantity: result.quantity } : v
                ),
              }
            : c
        )
      );
    } catch (err) {
      console.error("Increment failed:", err);
    } finally {
      setPendingCardIds((prev) => {
        const next = new Set(prev);
        next.delete(variantId);
        return next;
      });
    }
  }

  async function handleDecrement(card: InventoryCard, variantId: number) {
    if (pendingCardIds.has(variantId)) return;
    setPendingCardIds((prev) => new Set(prev).add(variantId));
    try {
      const result = await decrementCard(variantId);
      setCards((prev) =>
        prev.map((c) =>
          c.base_card_id === card.base_card_id
            ? {
                ...c,
                inventory: { ...c.inventory, [variantId]: result.quantity },
                variants: c.variants.map((v) =>
                  v.variant_id === variantId ? { ...v, quantity: result.quantity } : v
                ),
              }
            : c
        )
      );
    } catch (err) {
      console.error("Decrement failed:", err);
    } finally {
      setPendingCardIds((prev) => {
        const next = new Set(prev);
        next.delete(variantId);
        return next;
      });
    }
  }

  if (error) return <p className="loading-text">Error: {error}</p>;

  return (
    <div className="screen">
      {loading ? (
        <p className="loading-text">Loading inventory…</p>
      ) : (
        <>
          <InventorySummary cards={filtered}>
            <SWUButton size="sm" onClick={() => setModalOpen(true)}>
              Add Cards
            </SWUButton>
          </InventorySummary>
          {modalOpen && (
            <AddCardsModal
              catalog={rawCards}
              onClose={() => setModalOpen(false)}
              onCommitted={() => {
                fetchInventory().catch(console.error);
              }}
            />
          )}
          <FilterPanel filters={filters} setFilters={setFilters} cards={cards as BaseCard[]}>
            <div className="ifp-toggle-row">
              <button
                type="button"
                className={`pl-toggle${incompleteOnly ? " pl-toggle--on" : ""}`}
                onClick={() => setIncompleteOnly((v) => !v)}
                aria-pressed={incompleteOnly}
              >
                <span className="pl-toggle__box" />
                <span className="pl-toggle__label">Show only incomplete playsets</span>
              </button>
            </div>
          </FilterPanel>
          <InventoryTable
            cards={filtered}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            pendingCardIds={pendingCardIds}
          />
        </>
      )}
    </div>
  );
}
