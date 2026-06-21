import React, { useState, useMemo, useRef, useEffect } from "react";
import { SWUButton } from "../../components/SWUButton";
import { resolveRow, inventoryStatus } from "../../utils/addCardsResolver";
import type { Row, ResolveResult, InventoryStatus } from "../../utils/addCardsResolver";
import type { CardWithQty } from "../../api/inventory";

interface Props {
  setCode: string;
  rows: Row[];
  catalog: CardWithQty[];
  onAppendRow: (rowData: Omit<Row, "id">) => void;
  onDeleteRow: (id: string) => void;
}

function InventoryDot({ status }: { status: InventoryStatus | null }) {
  if (!status) {
    return <span className="ac-dot ac-dot--empty" aria-hidden="true" />;
  }
  return (
    <span
      className={`ac-dot ac-dot--${status.color}`}
      title={`${status.owned}/${status.max} in inventory`}
      aria-label={`${status.owned} of ${status.max} owned`}
    />
  );
}

interface PickerProps {
  label: string;
  options: string[];
  selected: string | null;
  disabled: boolean;
  resolvedValue: string | null;
  onChange: (value: string | null) => void;
}

// Shared control for both ambiguity-gated axes (provenance, finish): a plain
// select that only has meaningful options once the row's status surfaces
// them. When resolved, render the settled value as plain text instead.
function AxisPicker({ label, options, selected, disabled, resolvedValue, onChange }: PickerProps) {
  if (resolvedValue !== null) {
    return (
      <div className="ac-namefield">
        <span className="ac-namefield__name">{resolvedValue}</span>
      </div>
    );
  }

  const isDisabled = disabled || options.length === 0;
  return (
    <select
      className="ac-select"
      value={selected || ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={isDisabled}
      aria-label={label}
    >
      <option value="">{`Select ${label.toLowerCase()}…`}</option>
      {options.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}

export function AddCardsKeypad({ setCode, rows, catalog, onAppendRow, onDeleteRow }: Props) {
  const [draft, setDraft] = useState({
    cardNumber: "",
    channel: null as string | null,
    finish: null as string | null,
  });
  const cardInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft({ cardNumber: "", channel: null, finish: null });
  }, [setCode]);

  const draftRow: Row = useMemo(() => ({ id: "__draft__", ...draft }), [draft]);

  const resolved: ResolveResult = resolveRow(setCode, draftRow, catalog);

  const isResolved = resolved.status === "resolved";
  const needsProvenance = resolved.status === "needs_provenance";
  const needsFinish = resolved.status === "needs_finish";
  const hasError = resolved.status === "error";
  const isPending = needsProvenance || needsFinish;

  const name =
    resolved.status === "resolved" ||
    resolved.status === "needs_provenance" ||
    resolved.status === "needs_finish"
      ? resolved.name
      : null;

  const subtitle =
    resolved.status === "resolved" ||
    resolved.status === "needs_provenance" ||
    resolved.status === "needs_finish"
      ? resolved.subtitle
      : null;

  const channelOptions = resolved.status === "needs_provenance" ? resolved.channels : [];
  const finishOptions = resolved.status === "needs_finish" ? resolved.finishes : [];

  const draftInv =
    isResolved && resolved.status === "resolved"
      ? inventoryStatus(setCode, [...rows, draftRow], draftRow, resolved, catalog)
      : null;

  const canCommit = isResolved;

  function commitDraft() {
    if (!canCommit) return;
    onAppendRow({ cardNumber: draft.cardNumber, channel: draft.channel, finish: draft.finish });
    setDraft({ cardNumber: "", channel: null, finish: null });
    setTimeout(() => cardInputRef.current?.focus(), 0);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    commitDraft();
  }

  const committed = rows.filter((r) => r.cardNumber);

  return (
    <div className="ac-pad">
      <form className="ac-pad__entry" onSubmit={onSubmit} noValidate>
        <div>
          <span className="ac-pad__label">Card number</span>
          <div className="ac-pad__cardrow">
            <input
              ref={cardInputRef}
              type="text"
              inputMode="numeric"
              className={`ac-input ac-pad__big-input${hasError ? " ac-input--error" : ""}`}
              placeholder="000"
              value={draft.cardNumber}
              autoFocus
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d]/g, "");
                setDraft((d) => ({ ...d, cardNumber: v, channel: null, finish: null }));
              }}
            />
            <InventoryDot status={draftInv} />
          </div>
          {hasError && resolved.status === "error" && (
            <div className="ac-row-error" style={{ marginTop: 8 }}>
              {resolved.message}
            </div>
          )}
        </div>

        <div className="ac-pad__resolve">
          <div
            className={`ac-pad__resolve-name${
              isResolved || isPending ? "" : " ac-pad__resolve-name--empty"
            }`}
          >
            {name ?? "Card name will appear here"}
          </div>
          {subtitle && <div className="ac-pad__resolve-sub">{subtitle}</div>}

          <div className="ac-pad__resolve-controls">
            <div className="ac-pad__resolve-variant">
              <span className="ac-pad__label">Provenance</span>
              <AxisPicker
                label="Provenance"
                options={channelOptions}
                selected={draft.channel}
                disabled={!needsProvenance}
                resolvedValue={
                  resolved.status === "resolved" || resolved.status === "needs_finish"
                    ? ((resolved as { channel?: string }).channel ?? null)
                    : null
                }
                onChange={(v) => setDraft((d) => ({ ...d, channel: v, finish: null }))}
              />
            </div>
            <div className="ac-pad__resolve-variant">
              <span className="ac-pad__label">Finish</span>
              <AxisPicker
                label="Finish"
                options={finishOptions}
                selected={draft.finish}
                disabled={!needsFinish}
                resolvedValue={resolved.status === "resolved" ? resolved.finish : null}
                onChange={(v) => setDraft((d) => ({ ...d, finish: v }))}
              />
            </div>
            <SWUButton size="sm" active={canCommit} onClick={canCommit ? commitDraft : undefined}>
              Add Card
            </SWUButton>
          </div>

          {isResolved && draftInv && (
            <div
              className="ac-pad__resolve-sub"
              style={{
                color:
                  draftInv.color === "red" ? "var(--aspect-aggression)" : "var(--aspect-command)",
              }}
            >
              {draftInv.color === "red"
                ? `At limit — ${draftInv.owned}/${draftInv.max} already in inventory`
                : `Headroom: ${Math.max(0, draftInv.max - draftInv.owned)} of ${draftInv.max}`}
            </div>
          )}
          {needsProvenance && (
            <div className="ac-pad__resolve-sub" style={{ color: "var(--color-primary)" }}>
              Select a provenance to continue.
            </div>
          )}
          {needsFinish && (
            <div className="ac-pad__resolve-sub" style={{ color: "var(--color-primary)" }}>
              Select a finish to enable Add Card.
            </div>
          )}
        </div>

        {/* Hidden submit button keeps Enter-to-submit working across browsers */}
        <button type="submit" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" />
      </form>

      <div className="ac-pad__list-wrap">
        <div className="ac-pad__list-head">
          <span className="ac-pad__list-title">Cards in this batch</span>
          <span className="ac-pad__list-count">{committed.length}</span>
        </div>
        <div className="ac-pad__list">
          {committed.length === 0 && (
            <div className="ac-pad__list-empty">
              No cards yet. Type a card number and press Enter (or click Add Card) to begin building
              your batch.
            </div>
          )}
          {committed.map((row) => {
            const res = resolveRow(setCode, row, catalog);
            const inv =
              res.status === "resolved" ? inventoryStatus(setCode, rows, row, res, catalog) : null;
            return (
              <div key={row.id} className="ac-chip">
                <span className="ac-chip__num">{row.cardNumber}</span>
                <span
                  className="ac-chip__name"
                  title={res.status === "resolved" ? res.name : "Invalid"}
                >
                  {res.status === "resolved" ? res.name : "—"}
                </span>
                <span
                  className={`ac-chip__var${
                    res.status === "resolved" && res.channel !== "Retail" ? " ac-chip__var--op" : ""
                  }`}
                >
                  {res.status === "resolved" ? res.finish : ""}
                </span>
                <span
                  className={`ac-chip__ind${inv ? ` ac-chip__ind--${inv.color}` : ""}`}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="ac-chip__del"
                  onClick={() => onDeleteRow(row.id)}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
