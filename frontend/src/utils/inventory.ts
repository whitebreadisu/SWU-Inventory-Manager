import type { BaseCard, SetOrderMap, Variant } from "./catalog";
import { sortBaseCards } from "./catalog";
import type { CardWithQty } from "../api/inventory";

export const PLAYSET_SIZE = 3;

const SINGLETON_TYPES = new Set(["Leader", "Base"]);

export function getPlaysetSize(type: string): number {
  return SINGLETON_TYPES.has(type) ? 1 : PLAYSET_SIZE;
}

export function cardOwnedTotal(inventory: Record<number, number>): number {
  return Object.values(inventory).reduce((sum, qty) => sum + (qty || 0), 0);
}

export function isPlaysetComplete(inventory: Record<number, number>, type: string): boolean {
  return cardOwnedTotal(inventory) >= getPlaysetSize(type);
}

export function isOwned(inventory: Record<number, number>): boolean {
  return cardOwnedTotal(inventory) > 0;
}

export interface InventoryVariant extends Variant {
  quantity: number;
}

export interface InventoryCard extends BaseCard {
  variants: InventoryVariant[];
  inventory: Record<number, number>;
}

export function groupWithInventory(
  cards: CardWithQty[],
  setOrder: SetOrderMap = {}
): InventoryCard[] {
  const map = new Map<number, InventoryCard>();

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
        inventory: {},
      };
      map.set(card.base_card_id, base);
    }

    base.variants.push({
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
      quantity: card.quantity,
    });
    base.inventory[card.id] = card.quantity;
  }

  return sortBaseCards(Array.from(map.values()), setOrder);
}

export function cardOwnedTotalFromVariants(variants: InventoryVariant[]): number {
  return variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
}
