import { authedFetch } from "./authedFetch";

export interface VariantDetail {
  variant_id: number;
  variant_type: string;
  finish: string | null;
  channel: string;
  stamped: boolean;
  source_set_code: string;
  source_set_name: string;
  card_number: string;
  front_image_url: string | null;
  back_image_url: string | null;
  stamp_group: string | null;
  quantity: number;
}

export interface BaseCardDetail {
  id: number;
  set_code: string;
  set_name: string;
  base_card_number: string;
  name: string;
  subtitle: string | null;
  type: string;
  type2: string | null;
  double_sided: boolean;
  rarity: string;
  cost: number | null;
  power: number | null;
  hp: number | null;
  arena: string | null;
  is_unique: boolean | null;
  front_text: string | null;
  back_text: string | null;
  epic_action: string | null;
  artist: string | null;
  is_token: boolean;
  aspects: string[];
  keywords: string[];
  traits: string[];
  variants: VariantDetail[];
}

export async function getBaseCardDetail(baseCardId: number): Promise<BaseCardDetail> {
  const res = await authedFetch(`/api/base-cards/${baseCardId}`);
  if (!res.ok) throw new Error(`Failed to fetch base card ${baseCardId}: ${res.status}`);
  return res.json();
}
