import { authedFetch } from './authedFetch';

export interface CardSet {
  id: number;
  code: string;
  name: string;
  has_unique_variant_numbers: boolean;
}

export async function getSets(): Promise<CardSet[]> {
  const res = await authedFetch('/api/sets');
  if (!res.ok) throw new Error(`Failed to fetch sets: ${res.status}`);
  return res.json();
}

export async function getSet(code: string): Promise<CardSet> {
  const res = await authedFetch(`/api/sets/${code}`);
  if (!res.ok) throw new Error(`Failed to fetch set ${code}: ${res.status}`);
  return res.json();
}
