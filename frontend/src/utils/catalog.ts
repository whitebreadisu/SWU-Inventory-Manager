import type { Card } from '../api/cards';

export interface BaseCard {
  set_code: string;
  base_card_number: string;
  name: string;
  rarity: string;
  type: string;
  aspects: string[];
  keywords: string[];
  traits: string[];
  cost: number | null;
  power: number | null;
  hp: number | null;
  arena: string | null;
  hasStandard: boolean;
  hasFoil: boolean;
  hasHyperspace: boolean;
  hasHyperspaceFoil: boolean;
  hasPrestige: boolean;
  hasPrestigeFoil: boolean;
  hasOp: boolean;
  hasOpFoil: boolean;
}

export function parseCardDisplay(card: BaseCard): { displayName: string; subtitle: string | null } {
  if (card.type === 'Base') {
    return { displayName: card.name, subtitle: card.traits[0] ?? null };
  }
  const sep = card.name.indexOf(' - ');
  if (sep !== -1) {
    return { displayName: card.name.slice(0, sep), subtitle: card.name.slice(sep + 3) };
  }
  return { displayName: card.name, subtitle: null };
}

export function groupByBaseCard(cards: Card[]): BaseCard[] {
  const map = new Map<string, BaseCard>();

  for (const card of cards) {
    const key = `${card.set_code}::${card.base_card_number}`;

    if (!map.has(key)) {
      map.set(key, {
        set_code: card.set_code,
        base_card_number: card.base_card_number,
        name: card.name,
        rarity: card.rarity,
        type: card.type,
        aspects: card.aspects,
        keywords: card.keywords,
        traits: card.traits,
        cost: card.cost,
        power: card.power,
        hp: card.hp,
        arena: card.arena,
        hasStandard: false,
        hasFoil: false,
        hasHyperspace: false,
        hasHyperspaceFoil: false,
        hasPrestige: false,
        hasPrestigeFoil: false,
        hasOp: false,
        hasOpFoil: false,
      });
    }

    const base = map.get(key)!;

    if (card.is_organized_play) {
      if (card.is_foil) base.hasOpFoil = true;
      else base.hasOp = true;
    } else if (card.is_prestige) {
      if (card.is_foil) base.hasPrestigeFoil = true;
      else base.hasPrestige = true;
    } else if (card.is_hyperspace) {
      if (card.is_foil) base.hasHyperspaceFoil = true;
      else base.hasHyperspace = true;
    } else if (card.is_foil) {
      base.hasFoil = true;
    } else {
      base.hasStandard = true;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.set_code !== b.set_code) return a.set_code.localeCompare(b.set_code);
    return a.base_card_number.localeCompare(b.base_card_number, undefined, { numeric: true });
  });
}
