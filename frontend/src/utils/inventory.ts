import type { BaseCard } from "./catalog";
import type { CardWithQty } from "../api/inventory";

export interface VariantDef {
  key: keyof BaseCard;
  invKey: string;
  short: string;
  label: string;
  color: string;
  solid: boolean;
}

export const VARIANT_DEFS: VariantDef[] = [
  {
    key: "hasStandard",
    invKey: "standard",
    short: "S",
    label: "Standard",
    color: "#6b7280",
    solid: true,
  },
  { key: "hasFoil", invKey: "foil", short: "F", label: "Foil", color: "#9ca3af", solid: false },
  {
    key: "hasHyperspace",
    invKey: "hyperspace",
    short: "HS",
    label: "Hyperspace",
    color: "#2563eb",
    solid: true,
  },
  {
    key: "hasHyperspaceFoil",
    invKey: "hyperspaceFoil",
    short: "HSF",
    label: "Hyperspace Foil",
    color: "#60a5fa",
    solid: false,
  },
  {
    key: "hasPrestige",
    invKey: "prestige",
    short: "P",
    label: "Prestige",
    color: "#d97706",
    solid: true,
  },
  {
    key: "hasPrestigeFoil",
    invKey: "prestigeFoil",
    short: "PF",
    label: "Prestige Foil",
    color: "#fbbf24",
    solid: false,
  },
  { key: "hasOp", invKey: "op", short: "OP", label: "OP", color: "#dc2626", solid: true },
  {
    key: "hasOpFoil",
    invKey: "opFoil",
    short: "OPF",
    label: "OP Foil",
    color: "#f87171",
    solid: false,
  },
];

export const PLAYSET_SIZE = 3;

const SINGLETON_TYPES = new Set(["Leader", "Base"]);

export function getPlaysetSize(type: string): number {
  return SINGLETON_TYPES.has(type) ? 1 : PLAYSET_SIZE;
}

export function cardOwnedTotal(inventory: Record<string, number>): number {
  return Object.values(inventory).reduce((sum, qty) => sum + (qty || 0), 0);
}

export function isPlaysetComplete(inventory: Record<string, number>, type: string): boolean {
  return cardOwnedTotal(inventory) >= getPlaysetSize(type);
}

export function isOwned(inventory: Record<string, number>): boolean {
  return cardOwnedTotal(inventory) > 0;
}

export interface InventoryCard extends BaseCard {
  inventory: Record<string, number>;
  cardIds: Record<string, number>;
}

function getInvKey(card: CardWithQty): string {
  if (card.is_organized_play) return card.is_foil ? "opFoil" : "op";
  if (card.is_prestige) return card.is_foil ? "prestigeFoil" : "prestige";
  if (card.is_hyperspace) return card.is_foil ? "hyperspaceFoil" : "hyperspace";
  if (card.is_foil) return "foil";
  return "standard";
}

export function groupWithInventory(cards: CardWithQty[]): InventoryCard[] {
  const map = new Map<string, InventoryCard>();

  for (const card of cards) {
    const key = `${card.set_code}::${card.base_card_number}`;
    const invKey = getInvKey(card);

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
        inventory: {},
        cardIds: {},
      });
    }

    const base = map.get(key)!;

    // Set variant presence flag
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

    base.inventory[invKey] = card.quantity;
    base.cardIds[invKey] = card.id;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.set_code !== b.set_code) return a.set_code.localeCompare(b.set_code);
    return a.base_card_number.localeCompare(b.base_card_number, undefined, { numeric: true });
  });
}
