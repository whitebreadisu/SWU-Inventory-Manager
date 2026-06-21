import { useEffect, useState, useMemo, useCallback } from "react";
import { getInventory } from "../../api/inventory";
import { getSets } from "../../api/sets";
import { groupWithInventory, isPlaysetComplete } from "../../utils/inventory";
import { InventorySummary } from "./InventorySummary";
import { InventoryTable } from "./InventoryTable";
import { CardDetailPopup } from "../../components/CardDetailPopup";
import { CardInventoryPopup } from "./CardInventoryPopup";
import { FilterPanel, applyFilters, DEFAULT_FILTERS } from "../../components/FilterPanel";
import { SWUButton } from "../../components/SWUButton";
import { AddCardsModal } from "./AddCardsModal";
import type { InventoryCard } from "../../utils/inventory";
import type { CardWithQty } from "../../api/inventory";
import type { FilterState } from "../../components/FilterPanel";
import type { BaseCard, SetOrderMap } from "../../utils/catalog";
import "./inventory.css";

export function InventoryPage() {
  const [rawCards, setRawCards] = useState<CardWithQty[]>([]);
  const [cards, setCards] = useState<InventoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBaseCardId, setSelectedBaseCardId] = useState<number | null>(null);
  const [inventoryPopupBaseCardId, setInventoryPopupBaseCardId] = useState<number | null>(null);
  const [setOrder, setSetOrder] = useState<SetOrderMap>({});

  const fetchInventory = useCallback(async () => {
    const raw = await getInventory();
    setRawCards(raw);
  }, []);

  useEffect(() => {
    fetchInventory()
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [fetchInventory]);

  useEffect(() => {
    getSets()
      .then((sets) => {
        const orderMap: SetOrderMap = {};
        sets.forEach((s) => {
          orderMap[s.code] = s.release_date;
        });
        setSetOrder(orderMap);
      })
      .catch((err) => console.error("Failed to load sets:", err));
  }, []);

  useEffect(() => {
    setCards(groupWithInventory(rawCards, setOrder));
  }, [rawCards, setOrder]);

  const filtered = useMemo(() => {
    let result = applyFilters(cards as BaseCard[], filters) as InventoryCard[];
    if (incompleteOnly) result = result.filter((c) => !isPlaysetComplete(c.inventory, c.type));
    return result;
  }, [cards, filters, incompleteOnly]);

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
            onSelectCard={setSelectedBaseCardId}
            onSelectInventory={setInventoryPopupBaseCardId}
          />
        </>
      )}
      {selectedBaseCardId != null && (
        <CardDetailPopup
          baseCardId={selectedBaseCardId}
          onClose={() => setSelectedBaseCardId(null)}
        />
      )}
      {inventoryPopupBaseCardId != null && (
        <CardInventoryPopup
          baseCardId={inventoryPopupBaseCardId}
          onClose={() => setInventoryPopupBaseCardId(null)}
          onChanged={() => {
            fetchInventory().catch(console.error);
          }}
        />
      )}
    </div>
  );
}
