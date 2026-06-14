import { authedFetch } from './authedFetch';

export interface Card {
  id: number;
  set_id: number;
  set_code: string;
  base_card_number: string;
  card_number: string;
  name: string;
  rarity: string;
  type: string;
  is_foil: boolean;
  is_hyperspace: boolean;
  is_prestige: boolean;
  is_showcase: boolean;
  is_organized_play: boolean;
  aspects: string[];
  keywords: string[];
  traits: string[];
  cost: number | null;
  power: number | null;
  hp: number | null;
  arena: string | null;
}

export interface CardFilters {
  set_code?: string;
  variant?: string;
  type?: string;
  rarity?: string;
}

export async function getCards(filters: CardFilters = {}): Promise<Card[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  const res = await authedFetch(`/api/cards${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(`Failed to fetch cards: ${res.status}`);
  return res.json();
}
