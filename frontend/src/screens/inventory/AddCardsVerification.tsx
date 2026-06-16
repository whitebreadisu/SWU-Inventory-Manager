import type { VerificationItem } from "../../utils/addCardsResolver";

interface SectionProps {
  title: string;
  kind: "add" | "skip";
  count: number;
  items: VerificationItem[];
  reason?: string;
}

function Section({ title, kind, count, items, reason }: SectionProps) {
  return (
    <section className={`ac-verify__section ac-verify__section--${kind}`}>
      <div className="ac-verify__section-title">
        <span>{title}</span>
        <span className="ac-verify__section-rule" />
        <span className="ac-verify__count">
          {count} {count === 1 ? "card" : "cards"}
        </span>
      </div>
      <table className="ac-verify__table">
        <thead>
          <tr>
            <th style={{ width: 70 }}>Card#</th>
            <th>Name</th>
            <th style={{ width: 180 }}>Variant</th>
            <th style={{ width: 60 }}>OP</th>
            <th style={{ width: 100 }}>Inventory</th>
            {kind === "skip" && <th>Reason</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(({ row, resolved, inv }) => (
            <tr key={row.id}>
              <td style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
                {row.cardNumber}
              </td>
              <td className="ac-verify__name">
                {resolved.name}
                {resolved.subtitle && (
                  <div
                    style={{
                      fontSize: 11,
                      fontStyle: "italic",
                      color: "var(--color-text-muted)",
                      fontWeight: 400,
                    }}
                  >
                    {resolved.subtitle}
                  </div>
                )}
              </td>
              <td>{resolved.variant}</td>
              <td
                style={{
                  color: resolved.isOp ? "var(--variant-op)" : "var(--color-text-muted)",
                }}
              >
                {resolved.isOp ? "✓" : "—"}
              </td>
              <td>
                <span className="ac-dot-row">
                  <span className={`ac-dot ac-dot--${inv.color}`} aria-hidden="true" />
                  <span>
                    {inv.owned}/{inv.max}
                  </span>
                </span>
              </td>
              {kind === "skip" && <td className="ac-verify__skip-reason">{reason}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

interface Props {
  willAdd: VerificationItem[];
  willSkip: VerificationItem[];
}

export function AddCardsVerification({ willAdd, willSkip }: Props) {
  return (
    <div className="ac-verify">
      <Section
        title="The following cards will be added to inventory"
        kind="add"
        count={willAdd.length}
        items={willAdd}
      />
      {willSkip.length > 0 && (
        <Section
          title="The following cards will not be added"
          kind="skip"
          count={willSkip.length}
          items={willSkip}
          reason="Inventory limit already reached."
        />
      )}
    </div>
  );
}
