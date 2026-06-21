import type { CardWithQty } from "../api/inventory";

export type RowId = string;

// Two-axis (provenance x finish) ambiguity-gated resolver — see
// SWU_Catalog_Redesign_Spec.md §5.4. Source-set selection (which set's own
// numbering `card_number` is scoped to) is handled at the modal level, not
// per-row — it is what eliminates the old OP card-number-collision problem
// (a card_number is unique *within* its source set's numbering).
//
// Each row carries the user's chosen `channel` (provenance) and `finish`,
// populated only once each axis is found to be ambiguous and the user picks.
export interface Row {
  id: RowId;
  cardNumber: string;
  channel: string | null;
  finish: string | null;
}

export type ResolveResult =
  | { status: "empty" }
  | { status: "error"; message: string }
  | {
      status: "needs_provenance";
      name: string;
      subtitle: string | null;
      channels: string[];
    }
  | {
      status: "needs_finish";
      name: string;
      subtitle: string | null;
      finishes: string[];
    }
  | {
      status: "resolved";
      variantId: number;
      name: string;
      subtitle: string | null;
      type: string;
      channel: string;
      finish: string;
    };

export interface InventoryStatus {
  color: "green" | "red";
  owned: number;
  max: number;
}

export interface VerificationItem {
  row: Row;
  resolved: Extract<ResolveResult, { status: "resolved" }>;
  inv: InventoryStatus;
}

/** The finish label to use for grouping/display: the curated `finish` field,
 * falling back to the raw `variant_type` when `finish` is null (e.g. a
 * channel/tournament-tier label with no finish classification yet). */
export function finishLabel(card: CardWithQty): string {
  return card.finish ?? card.variant_type;
}

export function maxCopies(type: string): number {
  return type === "Leader" || type === "Base" ? 1 : 3;
}

function distinct(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Resolve a row's candidates within a single source set's own numbering.
 *
 * Axis 1 — provenance (channel): only surfaced when the entered card_number
 * exists under more than one distinct `channel` within this source set.
 * Axis 2 — finish: only surfaced when the (provenance-narrowed) candidates
 * map to more than one distinct `finish`.
 */
export function resolveRow(sourceSetCode: string, row: Row, catalog: CardWithQty[]): ResolveResult {
  if (!row.cardNumber) return { status: "empty" };

  const candidates = catalog.filter(
    (c) => c.source_set_code === sourceSetCode && c.card_number === row.cardNumber
  );

  if (candidates.length === 0) {
    return { status: "error", message: "Card# is not valid for the selected set." };
  }

  // ── Axis 1: provenance (channel) ──
  const channels = distinct(candidates.map((c) => c.channel));

  let narrowed = candidates;
  if (channels.length > 1) {
    if (!row.channel || !channels.includes(row.channel)) {
      const { name, subtitle } = candidates[0];
      return { status: "needs_provenance", name, subtitle, channels };
    }
    narrowed = candidates.filter((c) => c.channel === row.channel);
  }

  // name/subtitle are read after provenance narrowing: different channels at
  // the same card_number can be entirely different cards (the classic SOR
  // #20 collision), so the display name must reflect the narrowed set, not
  // the first candidate found before disambiguation.
  const { name, subtitle } = narrowed[0];

  // ── Axis 2: finish ──
  const finishes = distinct(narrowed.map(finishLabel));

  if (finishes.length > 1) {
    if (!row.finish || !finishes.includes(row.finish)) {
      return { status: "needs_finish", name, subtitle, finishes };
    }
    narrowed = narrowed.filter((c) => finishLabel(c) === row.finish);
  }

  // narrowed.length should now be exactly 1; if data has a true duplicate
  // (e.g. the documented Serialized Prestige image-collision case), take the
  // first deterministically rather than erroring the user out.
  const card = narrowed[0];
  return {
    status: "resolved",
    variantId: card.id,
    name,
    subtitle,
    type: card.type,
    channel: card.channel,
    finish: finishLabel(card),
  };
}

export function inventoryStatus(
  sourceSetCode: string,
  rows: Row[],
  row: Row,
  resolved: Extract<ResolveResult, { status: "resolved" }>,
  catalog: CardWithQty[]
): InventoryStatus {
  const owned = catalog.find((c) => c.id === resolved.variantId)?.quantity ?? 0;
  const max = maxCopies(resolved.type);

  const idx = rows.indexOf(row);
  let pendingThroughThis = 0;
  for (let i = 0; i <= idx; i++) {
    const r = rows[i];
    const rr = resolveRow(sourceSetCode, r, catalog);
    if (rr.status === "resolved" && rr.variantId === resolved.variantId) {
      pendingThroughThis++;
    }
  }

  const wouldBe = owned + pendingThroughThis;
  return { color: wouldBe > max ? "red" : "green", owned, max };
}

export function splitForVerification(
  sourceSetCode: string,
  rows: Row[],
  catalog: CardWithQty[]
): { willAdd: VerificationItem[]; willSkip: VerificationItem[] } {
  const willAdd: VerificationItem[] = [];
  const willSkip: VerificationItem[] = [];

  rows.forEach((row) => {
    const res = resolveRow(sourceSetCode, row, catalog);
    if (res.status !== "resolved") return;
    const inv = inventoryStatus(sourceSetCode, rows, row, res, catalog);
    const item: VerificationItem = { row, resolved: res, inv };
    if (inv.color === "red") willSkip.push(item);
    else willAdd.push(item);
  });

  return { willAdd, willSkip };
}
