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

export function groupByBaseCard(cards: Card[]): BaseCard[] {
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

  return Array.from(map.values()).sort((a, b) => {
    if (a.set_code !== b.set_code) return a.set_code.localeCompare(b.set_code);
    return a.base_card_number.localeCompare(b.base_card_number, undefined, { numeric: true });
  });
}
