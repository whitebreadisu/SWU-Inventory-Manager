import type { Card } from "../api/cards";

export function getVariantLabel(card: Card): string {
  return card.finish ?? card.variant_type;
}

const RARITY_LABELS: Record<string, string> = {
  S: "Starter",
  C: "Common",
  U: "Uncommon",
  R: "Rare",
  L: "Legendary",
};

export function getRarityLabel(rarity: string): string {
  return RARITY_LABELS[rarity] ?? rarity;
}
