import { useState, useEffect, useMemo } from 'react';
import { getCards, type Card } from '../api/cards';
import { groupByBaseCard } from '../utils/catalog';
import { getRarityLabel } from '../utils/variants';
import { SWUButton } from './SWUButton';
import { AspectIcon } from './AspectIcon';
import { VariantCircles } from './VariantCircles';

const SET_CODES = ['SOR', 'TWI', 'SHD', 'JTL', 'LOF', 'SEC', 'LAW'] as const;
const ASPECTS = ['Command', 'Aggression', 'Cunning', 'Vigilance', 'Heroism', 'Villainy'] as const;

export function CatalogPage() {
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSets, setActiveSets] = useState(() => new Set<string>(SET_CODES));
  const [activeAspects, setActiveAspects] = useState(() => new Set<string>(ASPECTS));

  useEffect(() => {
    getCards()
      .then(setAllCards)
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const baseCards = useMemo(() => groupByBaseCard(allCards), [allCards]);

  const filtered = useMemo(() => baseCards.filter(card => {
    if (!activeSets.has(card.set_code)) return false;
    if (card.aspects.length > 0 && !card.aspects.every(a => activeAspects.has(a))) return false;
    return true;
  }), [baseCards, activeSets, activeAspects]);

  function toggleSet(code: string) {
    setActiveSets(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function toggleAspect(aspect: string) {
    setActiveAspects(prev => {
      const next = new Set(prev);
      next.has(aspect) ? next.delete(aspect) : next.add(aspect);
      return next;
    });
  }

  if (error) return <p className="loading-text">Error: {error}</p>;

  return (
    <div className="catalog-page">
      <h2 className="catalog-heading">Catalog</h2>

      <div className="filter-bar">
        <div className="filter-group">
          {SET_CODES.map(code => (
            <SWUButton key={code} active={activeSets.has(code)} onClick={() => toggleSet(code)} size="sm">
              {code}
            </SWUButton>
          ))}
        </div>

        <div className="filter-group">
          {ASPECTS.map(aspect => (
            <button
              key={aspect}
              className={`aspect-filter-btn${activeAspects.has(aspect) ? '' : ' aspect-filter-btn--inactive'}`}
              onClick={() => toggleAspect(aspect)}
              title={aspect}
            >
              <AspectIcon aspect={aspect} size={28} />
            </button>
          ))}
        </div>
      </div>

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
              {filtered.map(card => (
                <tr key={`${card.set_code}-${card.base_card_number}`}>
                  <td>{card.name}</td>
                  <td>{getRarityLabel(card.rarity)}</td>
                  <td>
                    <span className="aspect-cell">
                      {card.aspects.map(a => <AspectIcon key={a} aspect={a} size={16} />)}
                    </span>
                  </td>
                  <td>{card.type}</td>
                  <td className={card.cost == null ? 'cell-muted' : ''}>{card.cost ?? '—'}</td>
                  <td className={card.power == null ? 'cell-muted' : ''}>{card.power ?? '—'}</td>
                  <td className={card.hp == null ? 'cell-muted' : ''}>{card.hp ?? '—'}</td>
                  <td className={card.traits.length === 0 ? 'cell-muted' : ''}>{card.traits.join(', ') || '—'}</td>
                  <td className={card.keywords.length === 0 ? 'cell-muted' : ''}>{card.keywords.join(', ') || '—'}</td>
                  <td className={card.arena == null ? 'cell-muted' : ''}>{card.arena ?? '—'}</td>
                  <td><VariantCircles card={card} /></td>
                  <td className="cell-muted">{card.set_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
