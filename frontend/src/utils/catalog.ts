import type { Card } from "../api/cards";

export interface Variant {
  variant_id: number;
  variant_type: string;
  finish: string | null;
  channel: string;
  stamped: boolean;
  source_set_code: string;
  card_number: string;
  front_image_url: string | null;
  back_image_url: string | null;
  stamp_group: string | null;
}

export interface BaseCard {
  base_card_id: number;
  set_code: string;
  base_card_number: string;
  name: string;
  subtitle: string | null;
  type: string;
  rarity: string;
  aspects: string[];
  keywords: string[];
  traits: string[];
  cost: number | null;
  power: number | null;
  hp: number | null;
  arena: string | null;
  is_token: boolean;
  variants: Variant[];
}

function toVariant(card: Card): Variant {
  return {
    variant_id: card.id,
    variant_type: card.variant_type,
    finish: card.finish,
    channel: card.channel,
    stamped: card.stamped,
    source_set_code: card.source_set_code,
    card_number: card.card_number,
    front_image_url: card.front_image_url,
    back_image_url: card.back_image_url,
    stamp_group: card.stamp_group,
  };
}

export function parseCardDisplay(card: BaseCard): { displayName: string; subtitle: string | null } {
  if (card.subtitle == null && card.type === "Base") {
    return { displayName: card.name, subtitle: card.traits[0] ?? null };
  }
  return { displayName: card.name, subtitle: card.subtitle };
}

/** set_code → release_date (nullable ISO date string), used to order sets by
 * release for the standard sort (redesign spec §5.2/§5.3). Built by callers
 * from `getSets()` so catalog.ts doesn't depend on the sets API directly. */
export type SetOrderMap = Record<string, string | null>;

/** Standard sort: (1) set in release order, nulls last tiebroken by
 * set_code, (2) tokens last within a set, (3) base_card_number ascending
 * (numeric). Shared by Catalog and Inventory so both screens render rows in
 * the same order — see CatalogPage.tsx / InventoryPage.tsx. */
export function sortBaseCards<T extends BaseCard>(cards: T[], setOrder: SetOrderMap = {}): T[] {
  const setRank = (setCode: string): [number, string] => {
    const releaseDate = setOrder[setCode];
    if (releaseDate == null) return [1, setCode];
    return [0, releaseDate];
  };

  return cards.slice().sort((a, b) => {
    const [aHasDate, aKey] = setRank(a.set_code);
    const [bHasDate, bKey] = setRank(b.set_code);
    if (aHasDate !== bHasDate) return aHasDate - bHasDate;
    if (aKey !== bKey) return aKey < bKey ? -1 : 1;

    if (a.is_token !== b.is_token) return Number(a.is_token) - Number(b.is_token);

    return a.base_card_number.localeCompare(b.base_card_number, undefined, { numeric: true });
  });
}

export function groupByBaseCard(cards: Card[], setOrder: SetOrderMap = {}): BaseCard[] {
  const map = new Map<number, BaseCard>();

  for (const card of cards) {
    let base = map.get(card.base_card_id);
    if (!base) {
      base = {
        base_card_id: card.base_card_id,
        set_code: card.set_code,
        base_card_number: card.base_card_number,
        name: card.name,
        subtitle: card.subtitle,
        type: card.type,
        rarity: card.rarity,
        aspects: card.aspects,
        keywords: card.keywords,
        traits: card.traits,
        cost: card.cost,
        power: card.power,
        hp: card.hp,
        arena: card.arena,
        is_token: card.is_token,
        variants: [],
      };
      map.set(card.base_card_id, base);
    }

    base.variants.push(toVariant(card));
  }

  return sortBaseCards(Array.from(map.values()), setOrder);
}
