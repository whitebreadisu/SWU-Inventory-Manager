import { useEffect, useState, useMemo, useCallback } from "react";
import { getBaseCardDetail } from "../../api/baseCards";
import type { BaseCardDetail, VariantDetail } from "../../api/baseCards";
import { incrementCard, decrementCard } from "../../api/inventory";
import { getPlaysetSize } from "../../utils/inventory";
import "./CardInventoryPopup.css";

interface Props {
  baseCardId: number;
  onClose: () => void;
  onChanged?: () => void;
}

function variantLabel(v: VariantDetail): string {
  return `${v.finish ?? v.variant_type} – #${v.card_number} – ${v.source_set_code}`;
}

/** Representative card image (mock: "retain the card image" -- the standard
 * printing if present, else the first variant in API order). */
function pickRepresentative(variants: VariantDetail[]): VariantDetail | null {
  if (variants.length === 0) return null;
  return variants.find((v) => v.finish === "Standard") ?? variants[0];
}

export function CardInventoryPopup({ baseCardId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<BaseCardDetail | null>(null);
  const [variants, setVariants] = useState<VariantDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [pending, setPending] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBaseCardDetail(baseCardId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setVariants(data.variants);
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

  const close = useCallback(() => {
    if (changed) onChanged?.();
    onClose();
  }, [changed, onChanged, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  const playsetSize = detail ? getPlaysetSize(detail.type) : 3;
  const totalOwned = useMemo(() => variants.reduce((sum, v) => sum + v.quantity, 0), [variants]);

  const setPendingFor = useCallback((variantId: number, isPending: boolean) => {
    setPending((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(variantId);
      else next.delete(variantId);
      return next;
    });
  }, []);

  const handleIncrement = useCallback(
    async (variantId: number) => {
      setPendingFor(variantId, true);
      try {
        const result = await incrementCard(variantId);
        if (!result.blocked) {
          setVariants((prev) =>
            prev.map((v) => (v.variant_id === variantId ? { ...v, quantity: result.quantity } : v))
          );
          setChanged(true);
        }
      } finally {
        setPendingFor(variantId, false);
      }
    },
    [setPendingFor]
  );

  const handleDecrement = useCallback(
    async (variantId: number) => {
      setPendingFor(variantId, true);
      try {
        const result = await decrementCard(variantId);
        setVariants((prev) =>
          prev.map((v) => (v.variant_id === variantId ? { ...v, quantity: result.quantity } : v))
        );
        setChanged(true);
      } finally {
        setPendingFor(variantId, false);
      }
    },
    [setPendingFor]
  );

  const representative = useMemo(() => pickRepresentative(variants), [variants]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close();
  };

  return (
    <div className="cip-overlay" onMouseDown={handleBackdrop}>
      <div className="cip-modal" role="dialog" aria-modal="true" aria-labelledby="cip-title">
        {loading && <div className="cip-status">Loading…</div>}
        {!loading && error && <div className="cip-status cip-status--error">{error}</div>}
        {!loading && !error && detail && (
          <>
            <div className="cip-head">
              <div>
                <h2 className="cip-title" id="cip-title">
                  {detail.name}
                </h2>
                {detail.subtitle && <div className="cip-subtitle">{detail.subtitle}</div>}
              </div>
              <button type="button" className="cip-close" onClick={close} aria-label="Close">
                ×
              </button>
            </div>

            <div className="cip-body">
              <div className="cip-left">
                {representative?.front_image_url && (
                  <img
                    className="cip-image"
                    src={representative.front_image_url}
                    alt={`${detail.name}${detail.subtitle ? ` – ${detail.subtitle}` : ""}`}
                  />
                )}
              </div>

              <div className="cip-right">
                <div className="cip-variant-list">
                  {variants.map((v) => {
                    const isPending = pending.has(v.variant_id);
                    const atSingletonCap = playsetSize === 1 && v.quantity >= 1;
                    const atPlaysetCap = playsetSize > 1 && totalOwned >= playsetSize;
                    const incDisabled = isPending || atSingletonCap || atPlaysetCap;
                    const decDisabled = isPending || v.quantity <= 0;

                    return (
                      <div className="cip-row" key={v.variant_id}>
                        <span className="cip-row__label">{variantLabel(v)}</span>
                        <span className="cip-row__controls">
                          <button
                            type="button"
                            className="cip-step cip-step--dec"
                            aria-label={`Decrement ${variantLabel(v)}`}
                            disabled={decDisabled}
                            onClick={() => handleDecrement(v.variant_id)}
                          >
                            −
                          </button>
                          <span className="cip-row__qty">{v.quantity}</span>
                          <button
                            type="button"
                            className="cip-step cip-step--inc"
                            aria-label={`Increment ${variantLabel(v)}`}
                            disabled={incDisabled}
                            onClick={() => handleIncrement(v.variant_id)}
                          >
                            +
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
