import type { Card } from './cards';

export interface CardWithQty extends Card {
  quantity: number;
}

export interface IncrementResult {
  card_id: number;
  quantity: number;
  playset_complete: boolean;
  blocked: boolean;
  reason: string | null;
}

export interface DecrementResult {
  card_id: number;
  quantity: number;
}

export async function getInventory(): Promise<CardWithQty[]> {
  const res = await fetch('/api/inventory');
  if (!res.ok) throw new Error(`Failed to fetch inventory: ${res.status}`);
  return res.json();
}

export async function incrementCard(cardId: number): Promise<IncrementResult> {
  const res = await fetch(`/api/inventory/${cardId}/increment`, { method: 'POST' });
  if (!res.ok) throw new Error(`Increment failed for card ${cardId}: ${res.status}`);
  return res.json();
}

export async function decrementCard(cardId: number): Promise<DecrementResult> {
  const res = await fetch(`/api/inventory/${cardId}/decrement`, { method: 'POST' });
  if (!res.ok) throw new Error(`Decrement failed for card ${cardId}: ${res.status}`);
  return res.json();
}
