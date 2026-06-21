import { authedFetch } from "./authedFetch";

export interface Card {
  id: number;
  base_card_id: number;
  set_id: number;
  set_code: string;
  base_card_number: string;
  card_number: string;
  name: string;
  subtitle: string | null;
  rarity: string;
  type: string;
  variant_type: string;
  finish: string | null;
  channel: string;
  stamped: boolean;
  is_token: boolean;
  source_set_code: string;
  swuapi_id: string;
  front_image_url: string | null;
  back_image_url: string | null;
  stamp_group: string | null;
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
  variant_type?: string;
  type?: string;
  rarity?: string;
}

export async function getCards(filters: CardFilters = {}): Promise<Card[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  const res = await authedFetch(`/api/cards${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Failed to fetch cards: ${res.status}`);
  return res.json();
}
