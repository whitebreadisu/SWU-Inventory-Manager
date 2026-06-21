import { authedFetch } from "./authedFetch";

export interface CardSet {
  id: number;
  code: string;
  name: string;
  is_base_set: boolean;
}

export async function getSets(): Promise<CardSet[]> {
  const res = await authedFetch("/api/sets");
  if (!res.ok) throw new Error(`Failed to fetch sets: ${res.status}`);
  return res.json();
}
