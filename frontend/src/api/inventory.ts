import type { Card } from "./cards";
import { authedFetch } from "./authedFetch";

export interface CardWithQty extends Card {
  quantity: number;
}

export interface IncrementResult {
  variant_id: number;
  quantity: number;
  playset_complete: boolean;
  blocked: boolean;
  reason: string | null;
}

export interface DecrementResult {
  variant_id: number;
  quantity: number;
}

export async function getInventory(): Promise<CardWithQty[]> {
  const res = await authedFetch("/api/inventory");
  if (!res.ok) throw new Error(`Failed to fetch inventory: ${res.status}`);
  return res.json();
}

export async function incrementCard(variantId: number): Promise<IncrementResult> {
  const res = await authedFetch(`/api/inventory/${variantId}/increment`, { method: "POST" });
  if (!res.ok) throw new Error(`Increment failed for variant ${variantId}: ${res.status}`);
  return res.json();
}

export async function decrementCard(variantId: number): Promise<DecrementResult> {
  const res = await authedFetch(`/api/inventory/${variantId}/decrement`, { method: "POST" });
  if (!res.ok) throw new Error(`Decrement failed for variant ${variantId}: ${res.status}`);
  return res.json();
}
