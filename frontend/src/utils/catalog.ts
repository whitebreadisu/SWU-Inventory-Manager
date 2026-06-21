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

/** Curated fallback release order for the 10 base sets, used when a set has
 * no `release_date` in the data (swuapi doesn't currently supply dates, so
 * as of this writing this is the order that actually governs). Spark of the
 * Rebellion through 2026 Twin Suns. Sets absent from both `setOrder` and
 * this list sort last, tiebroken by set_code. */
export const CURATED_SET_ORDER = [
  "SOR",
  "SHD",
  "TWI",
  "JTL",
  "LOF",
  "SEC",
  "LAW",
  "ASH",
  "IBH",
  "TS26",
];

/** Standard sort: (1) set in release order — `release_date` when present,
 * else the curated fallback order, else last (tiebroken by set_code) —
 * (2) tokens last within a set, (3) base_card_number ascending (numeric).
 * Shared by Catalog and Inventory so both screens render rows in the same
 * order — see CatalogPage.tsx / InventoryPage.tsx. */
export function sortBaseCards<T extends BaseCard>(cards: T[], setOrder: SetOrderMap = {}): T[] {
  const setRank = (setCode: string): [number, string | number] => {
    const releaseDate = setOrder[setCode];
    if (releaseDate != null) return [0, releaseDate];

    const curatedIndex = CURATED_SET_ORDER.indexOf(setCode);
    if (curatedIndex !== -1) return [1, curatedIndex];

    return [2, setCode];
  };

  return cards.slice().sort((a, b) => {
    const [aTier, aKey] = setRank(a.set_code);
    const [bTier, bKey] = setRank(b.set_code);
    if (aTier !== bTier) return aTier - bTier;
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
