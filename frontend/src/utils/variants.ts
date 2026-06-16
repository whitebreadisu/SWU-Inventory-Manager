import type { Card } from "../api/cards";

export function getVariantLabel(card: Card): string {
  const parts: string[] = [];
  if (card.is_organized_play) parts.push("OP");
  if (card.is_hyperspace) parts.push("Hyperspace");
  if (card.is_prestige) parts.push("Prestige");
  if (card.is_showcase) parts.push("Showcase");
  if (card.is_foil) parts.push("Foil");
  return parts.length > 0 ? parts.join(" ") : "Standard";
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
