import { useState, useEffect, useMemo } from 'react';
import { getCards, type Card } from '../api/cards';
import { groupByBaseCard, parseCardDisplay } from '../utils/catalog';
import { getRarityLabel } from '../utils/variants';
import { AspectIcon } from './AspectIcon';
import { VariantCircles } from './VariantCircles';
import { FilterPanel, applyFilters, DEFAULT_FILTERS, type FilterState } from './FilterPanel';

const ASPECTS = ['Vigilance', 'Command', 'Aggression', 'Cunning', 'Heroism', 'Villainy'] as const;

export function CatalogPage() {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    getCards()
      .then(setAllCards)
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const baseCards = useMemo(() => groupByBaseCard(allCards), [allCards]);

  const filtered = useMemo(() => applyFilters(baseCards, filters), [baseCards, filters]);

  if (error) return <p className="loading-text">Error: {error}</p>;

  return (
    <div className="catalog-page">
      <h2 className="catalog-heading">Catalog</h2>

      <FilterPanel filters={filters} setFilters={setFilters} cards={baseCards} />

      {loading ? (
        <p className="loading-text">Loading cards…</p>
      ) : (
        <div className="catalog-table-wrapper">
          <table className="catalog-table">
            <thead>
              <tr>
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
              {filtered.map(card => {
                const { displayName, subtitle } = parseCardDisplay(card);
                const isBase = card.type === 'Base';
                return (
                  <tr key={`${card.set_code}-${card.base_card_number}`}>
                    <td>
                      {displayName}
                      {subtitle && <span className="card-subtitle">{subtitle}</span>}
                    </td>
                    <td>{getRarityLabel(card.rarity)}</td>
                    <td>
                      <span className="aspect-cell">
                        {card.aspects
                          .slice()
                          .sort((a, b) => ASPECTS.indexOf(a as typeof ASPECTS[number]) - ASPECTS.indexOf(b as typeof ASPECTS[number]))
                          .map(a => <AspectIcon key={a} aspect={a} size={16} />)}
                      </span>
                    </td>
                    <td>{card.type}</td>
                    <td className={card.cost == null ? 'cell-muted' : ''}>{card.cost ?? '—'}</td>
                    <td className={card.power == null ? 'cell-muted' : ''}>{card.power ?? '—'}</td>
                    <td className={card.hp == null ? 'cell-muted' : ''}>{card.hp ?? '—'}</td>
                    <td className={isBase || card.traits.length === 0 ? 'cell-muted' : ''}>
                      {isBase ? '—' : (card.traits.join(', ') || '—')}
                    </td>
                    <td className={card.keywords.length === 0 ? 'cell-muted' : ''}>{card.keywords.join('; ') || '—'}</td>
                    <td className={card.arena == null ? 'cell-muted' : ''}>{card.arena ?? '—'}</td>
                    <td><VariantCircles card={card} /></td>
                    <td className="cell-muted">{card.set_code}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
