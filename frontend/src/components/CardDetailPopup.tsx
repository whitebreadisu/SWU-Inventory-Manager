import { useEffect, useState, useMemo, useCallback } from "react";
import { getBaseCardDetail } from "../api/baseCards";
import type { BaseCardDetail, VariantDetail } from "../api/baseCards";
import { AspectIcon } from "./AspectIcon";
import "./CardDetailPopup.css";

interface Props {
  baseCardId: number;
  onClose: () => void;
}

/** Label format shared by the selection readout and each variant button
 * (SWU_Catalog_Redesign_Spec.md §5.3 / mock): "Standard – #4 – ASH". */
function variantLabel(v: VariantDetail): string {
  return `${v.finish ?? v.variant_type} – #${v.card_number} – ${v.source_set_code}`;
}

/** Canonical aspect display order, shared across the app (see FilterPanel's
 * ASPECT_LIST). Used here to render the aspect-name text line under the
 * AspectIcon row in a stable, app-consistent order. */
const ASPECT_ORDER = ["Vigilance", "Command", "Aggression", "Cunning", "Heroism", "Villainy"];

function orderAspects(aspects: string[]): string[] {
  return [...aspects].sort((a, b) => {
    const ai = ASPECT_ORDER.indexOf(a);
    const bi = ASPECT_ORDER.indexOf(b);
    return (ai === -1 ? ASPECT_ORDER.length : ai) - (bi === -1 ? ASPECT_ORDER.length : bi);
  });
}

/** Consolidates variants sharing a non-null stamp_group into one
 * representative entry (BL-31/§10.5/§5.3): pick the group member with
 * stamped === false if present, else the first member encountered.
 * Variants with a null stamp_group each remain their own entry.
 *
 * NOTE: temporarily unused by the variant button list (see
 * orderedVariantButtons below) — kept defined, not deleted, because
 * grouping is expected to return once the consolidation UX is decided.
 * The `void` reference just below keeps both tsc's noUnusedLocals and
 * eslint's no-unused-vars from flagging it while it sits dormant. */
function consolidateByStampGroup(variants: VariantDetail[]): VariantDetail[] {
  const groups = new Map<string, VariantDetail[]>();
  const ungrouped: VariantDetail[] = [];

  for (const v of variants) {
    if (v.stamp_group == null) {
      ungrouped.push(v);
      continue;
    }
    const bucket = groups.get(v.stamp_group);
    if (bucket) bucket.push(v);
    else groups.set(v.stamp_group, [v]);
  }

  const representatives: VariantDetail[] = [];
  for (const members of groups.values()) {
    const unstamped = members.find((m) => !m.stamped);
    representatives.push(unstamped ?? members[0]);
  }

  return [...ungrouped, ...representatives];
}
void consolidateByStampGroup;

/** Ordering for the variant button stack (§5.3 / mock): base set first
 * (the card's own set_code), then other source sets, then card_number
 * ascending within each set. */
function orderVariants(variants: VariantDetail[], baseSetCode: string): VariantDetail[] {
  const numericNumber = (v: VariantDetail) => {
    const n = Number(v.card_number);
    return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
  };
  return [...variants].sort((a, b) => {
    const aBase = a.source_set_code === baseSetCode ? 0 : 1;
    const bBase = b.source_set_code === baseSetCode ? 0 : 1;
    if (aBase !== bBase) return aBase - bBase;
    if (a.source_set_code !== b.source_set_code) {
      return a.source_set_code.localeCompare(b.source_set_code);
    }
    return numericNumber(a) - numericNumber(b);
  });
}

export function CardDetailPopup({ baseCardId, onClose }: Props) {
  const [detail, setDetail] = useState<BaseCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBaseCardDetail(baseCardId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setSelectedVariantId(data.variants[0]?.variant_id ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load card");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseCardId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Temporarily un-consolidated: render one button per variant (no
  // stamp_group collapse). consolidateByStampGroup is retained above for
  // when grouping returns; it is intentionally not called here.
  const orderedVariantButtons = useMemo(() => {
    if (!detail) return [];
    return orderVariants(detail.variants, detail.set_code);
  }, [detail]);

  const selectedVariant = useMemo(
    () => detail?.variants.find((v) => v.variant_id === selectedVariantId) ?? null,
    [detail, selectedVariantId]
  );

  const selectVariant = useCallback((variantId: number) => {
    setSelectedVariantId(variantId);
    setShowBack(false);
  }, []);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="cdp-overlay" onMouseDown={handleBackdrop}>
      <div className="cdp-modal" role="dialog" aria-modal="true" aria-labelledby="cdp-title">
        {loading && <div className="cdp-status">Loading…</div>}
        {!loading && error && <div className="cdp-status cdp-status--error">{error}</div>}
        {!loading && !error && detail && selectedVariant && (
          <>
            <div className="cdp-head">
              <div>
                <h2 className="cdp-title" id="cdp-title">
                  {detail.name}
                </h2>
                {detail.subtitle && <div className="cdp-subtitle">{detail.subtitle}</div>}
              </div>
              <button type="button" className="cdp-close" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>

            <div className="cdp-body">
              <div className="cdp-left">
                <div className="cdp-selection">{variantLabel(selectedVariant)}</div>

                <img
                  className="cdp-image"
                  src={
                    (showBack ? selectedVariant.back_image_url : selectedVariant.front_image_url) ??
                    undefined
                  }
                  alt={`${detail.name}${detail.subtitle ? ` – ${detail.subtitle}` : ""}`}
                />

                {selectedVariant.front_image_url && selectedVariant.back_image_url && (
                  <button type="button" className="cdp-flip" onClick={() => setShowBack((b) => !b)}>
                    {showBack ? "Show front" : "Show back"}
                  </button>
                )}

                <div className="cdp-variants">
                  {orderedVariantButtons.map((v) => (
                    <button
                      key={v.variant_id}
                      type="button"
                      className={`cdp-variant-btn${
                        v.variant_id === selectedVariant.variant_id
                          ? " cdp-variant-btn--active"
                          : ""
                      }`}
                      onClick={() => selectVariant(v.variant_id)}
                    >
                      {variantLabel(v)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cdp-right">
                <div className="cdp-info-grid">
                  <InfoField label="Aspect(s)">
                    {detail.aspects.length > 0 ? (
                      <>
                        <span className="cdp-aspects">
                          {detail.aspects.map((a) => (
                            <AspectIcon key={a} aspect={a} size={20} />
                          ))}
                        </span>
                        <div className="cdp-aspects-text">
                          {orderAspects(detail.aspects).join(", ")}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </InfoField>
                  <InfoField label="Type(s)">
                    {detail.type}
                    {detail.type2 ? `, ${detail.type2}` : ""}
                  </InfoField>
                  <InfoField label="Arena">{detail.arena ?? "—"}</InfoField>
                  <InfoField label="Keyword(s)">
                    {detail.keywords.length > 0 ? detail.keywords.join(", ") : "—"}
                  </InfoField>
                  <InfoField label="Cost">{detail.cost ?? "—"}</InfoField>
                  <InfoField label="Trait(s)">
                    {detail.traits.length > 0 ? detail.traits.join(", ") : "—"}
                  </InfoField>
                  <InfoField label="Power">{detail.power ?? "—"}</InfoField>
                  <InfoField label="Rarity">{detail.rarity}</InfoField>
                  <InfoField label="HP">{detail.hp ?? "—"}</InfoField>
                  <InfoField label="Set">{detail.set_name}</InfoField>
                  <InfoField label="Artist">{detail.artist ?? "—"}</InfoField>
                  <InfoField label="Card Number">{selectedVariant.card_number}</InfoField>
                </div>

                {detail.double_sided && detail.back_text ? (
                  <div className="cdp-text-block">
                    <div className="cdp-text-section">
                      <div className="cdp-text-section__header">{detail.type}</div>
                      {detail.front_text && <p className="cdp-text">{detail.front_text}</p>}
                      {detail.epic_action && (
                        <p className="cdp-text">
                          <span className="cdp-text__label">Epic Action: </span>
                          {detail.epic_action}
                        </p>
                      )}
                    </div>
                    <div className="cdp-text-divider" />
                    <div className="cdp-text-section">
                      <div className="cdp-text-section__header">{detail.type2 ?? "Back"}</div>
                      <p className="cdp-text">{detail.back_text}</p>
                    </div>
                  </div>
                ) : (
                  <div className="cdp-text-block">
                    {detail.front_text && <p className="cdp-text">{detail.front_text}</p>}
                    {detail.epic_action && (
                      <p className="cdp-text">
                        <span className="cdp-text__label">Epic Action: </span>
                        {detail.epic_action}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="cdp-info-field">
      <div className="cdp-info-field__label">{label.toUpperCase()}</div>
      <div className="cdp-info-field__value">{children}</div>
    </div>
  );
}
