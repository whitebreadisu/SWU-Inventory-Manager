import { useState, useEffect, useMemo } from "react";
import { getCards, type Card } from "../api/cards";
import { getSets } from "../api/sets";
import { groupByBaseCard, parseCardDisplay } from "../utils/catalog";
import { getRarityLabel } from "../utils/variants";
import { AspectIcon } from "./AspectIcon";
import { VariantsTooltip } from "./VariantsTooltip";
import { CardDetailPopup } from "./CardDetailPopup";
import { FilterPanel, applyFilters, DEFAULT_FILTERS, type FilterState } from "./FilterPanel";
import "./CatalogPage.css";

const ASPECTS = ["Vigilance", "Command", "Aggression", "Cunning", "Heroism", "Villainy"] as const;

export function CatalogPage() {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [setNameByCode, setSetNameByCode] = useState<Record<string, string>>({});
  const [selectedBaseCardId, setSelectedBaseCardId] = useState<number | null>(null);

  useEffect(() => {
    getCards()
      .then(setAllCards)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getSets()
      .then((sets) => {
        const map: Record<string, string> = {};
        sets.forEach((s) => {
          map[s.code] = s.name;
        });
        setSetNameByCode(map);
      })
      .catch((err) => console.error("Failed to load sets:", err));
  }, []);

  const baseCards = useMemo(() => groupByBaseCard(allCards), [allCards]);

  const filtered = useMemo(() => applyFilters(baseCards, filters), [baseCards, filters]);

  if (error) return <p className="loading-text">Error: {error}</p>;

  return (
    <div className="catalog-page">
      <FilterPanel filters={filters} setFilters={setFilters} cards={baseCards} />

      {loading ? (
        <p className="loading-text">Loading cards…</p>
      ) : (
        <div className="catalog-table-wrapper">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Rarity</th>
                <th>Aspect</th>
                <th>Type</th>
                <th>Cost</th>
                <th>Power</th>
                <th>HP</th>
                <th>Trait</th>
                <th>Keyword</th>
                <th>Arena</th>
                <th>Variants</th>
                <th>Set</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((card) => {
                const { displayName, subtitle } = parseCardDisplay(card);
                const isBase = card.type === "Base";
                return (
                  <tr key={`${card.set_code}-${card.base_card_number}`}>
                    <td className="cell-muted td-cardnum">{card.base_card_number}</td>
                    <td>
                      <button
                        type="button"
                        className="card-name-link"
                        onClick={() => setSelectedBaseCardId(card.base_card_id)}
                      >
                        {displayName}
                      </button>
                      {subtitle && <span className="card-subtitle">{subtitle}</span>}
                    </td>
                    <td>{getRarityLabel(card.rarity)}</td>
                    <td>
                      <span className="aspect-cell">
                        {card.aspects
                          .slice()
                          .sort(
                            (a, b) =>
                              ASPECTS.indexOf(a as (typeof ASPECTS)[number]) -
                              ASPECTS.indexOf(b as (typeof ASPECTS)[number])
                          )
                          .map((a) => (
                            <AspectIcon key={a} aspect={a} size={16} />
                          ))}
                      </span>
                    </td>
                    <td>{card.type}</td>
                    <td className={card.cost == null ? "cell-muted" : ""}>{card.cost ?? "—"}</td>
                    <td className={card.power == null ? "cell-muted" : ""}>{card.power ?? "—"}</td>
                    <td className={card.hp == null ? "cell-muted" : ""}>{card.hp ?? "—"}</td>
                    <td className={isBase || card.traits.length === 0 ? "cell-muted" : ""}>
                      {isBase ? "—" : card.traits.join(", ") || "—"}
                    </td>
                    <td className={card.keywords.length === 0 ? "cell-muted" : ""}>
                      {card.keywords.join("; ") || "—"}
                    </td>
                    <td className={card.arena == null ? "cell-muted" : ""}>{card.arena ?? "—"}</td>
                    <td>
                      <VariantsTooltip card={card} setNameByCode={setNameByCode} />
                    </td>
                    <td className="cell-muted">{card.set_code}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedBaseCardId != null && (
        <CardDetailPopup
          baseCardId={selectedBaseCardId}
          onClose={() => setSelectedBaseCardId(null)}
        />
      )}
    </div>
  );
}
