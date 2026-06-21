import type { CardWithQty } from "../api/inventory";

export type RowId = string;

export interface Row {
  id: RowId;
  cardNumber: string;
  op: boolean;
  variant: string | null;
}

export type ResolveResult =
  | { status: "empty" }
  | { status: "error"; message: string }
  | {
      status: "needs_variant";
      name: string;
      subtitle: string | null;
      variants: string[];
      hasOpOption: boolean;
    }
  | {
      status: "resolved";
      cardId: number;
      name: string;
      subtitle: string | null;
      type: string;
      variant: string;
      isOp: boolean;
      hasOpOption: boolean;
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

// NOTE (BL-33/redesign): this is a minimal field-mapping shim, not the real
// two-axis (provenance x finish) resolver called for by
// SWU_Catalog_Redesign_Spec.md §5.4. The old "OP" boolean is approximated
// here as `channel === "Weekly Play"`, and the old finish booleans are
// approximated as `finish ?? variant_type`. This keeps the build/tests
// green; the real provenance-pickers-only-when-ambiguous rewrite is a later
// phase (see BL-33 step 3+ / the Add Cards two-axis rewrite).
export function variantLabelNoOp(card: CardWithQty): string {
  return card.finish ?? card.variant_type;
}

function isOpCard(card: CardWithQty): boolean {
  return card.channel === "Weekly Play";
}

export function maxCopies(type: string): number {
  return type === "Leader" || type === "Base" ? 1 : 3;
}

function cardNameParts(card: CardWithQty): { displayName: string; subtitle: string | null } {
  return { displayName: card.name, subtitle: card.subtitle };
}

export function resolveRow(setCode: string, row: Row, catalog: CardWithQty[]): ResolveResult {
  if (!row.cardNumber) return { status: "empty" };

  const filtered = catalog.filter(
    (c) => c.set_code === setCode && c.card_number === row.cardNumber
  );

  const opMatches = filtered.filter(isOpCard);
  const baseMatches = filtered.filter((c) => !isOpCard(c));
  const hasOpOption = opMatches.length > 0;
  const activeSet = row.op ? opMatches : baseMatches;

  if (activeSet.length === 0) {
    return { status: "error", message: "Card# is not valid for the selected set." };
  }

  const { displayName: name, subtitle } = cardNameParts(activeSet[0]);

  if (activeSet.length === 1) {
    const card = activeSet[0];
    return {
      status: "resolved",
      cardId: card.id,
      name,
      subtitle,
      type: card.type,
      variant: variantLabelNoOp(card),
      isOp: !!row.op,
      hasOpOption,
    };
  }

  // Multiple cards share this card_number in the same OP partition: need variant pick
  const variants = activeSet.map((c) => variantLabelNoOp(c));

  if (!row.variant || !variants.includes(row.variant)) {
    return { status: "needs_variant", name, subtitle, variants, hasOpOption };
  }

  const idx = variants.indexOf(row.variant);
  const card = activeSet[idx];
  return {
    status: "resolved",
    cardId: card.id,
    name,
    subtitle,
    type: card.type,
    variant: row.variant,
    isOp: !!row.op,
    hasOpOption,
  };
}

export function inventoryStatus(
  setCode: string,
  rows: Row[],
  row: Row,
  resolved: Extract<ResolveResult, { status: "resolved" }>,
  catalog: CardWithQty[]
): InventoryStatus {
  const owned = catalog.find((c) => c.id === resolved.cardId)?.quantity ?? 0;
  const max = maxCopies(resolved.type);

  const idx = rows.indexOf(row);
  let pendingThroughThis = 0;
  for (let i = 0; i <= idx; i++) {
    const r = rows[i];
    const rr = resolveRow(setCode, r, catalog);
    if (rr.status === "resolved" && rr.cardId === resolved.cardId) {
      pendingThroughThis++;
    }
  }

  const wouldBe = owned + pendingThroughThis;
  return { color: wouldBe > max ? "red" : "green", owned, max };
}

export function splitForVerification(
  setCode: string,
  rows: Row[],
  catalog: CardWithQty[]
): { willAdd: VerificationItem[]; willSkip: VerificationItem[] } {
  const willAdd: VerificationItem[] = [];
  const willSkip: VerificationItem[] = [];

  rows.forEach((row) => {
    const res = resolveRow(setCode, row, catalog);
    if (res.status !== "resolved") return;
    const inv = inventoryStatus(setCode, rows, row, res, catalog);
    const item: VerificationItem = { row, resolved: res, inv };
    if (inv.color === "red") willSkip.push(item);
    else willAdd.push(item);
  });

  return { willAdd, willSkip };
}
