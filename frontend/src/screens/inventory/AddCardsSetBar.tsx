import { useState } from "react";
import type { CardSet } from "../../api/sets";

interface Props {
  sets: CardSet[];
  setCode: string | null;
  onChoose: (code: string) => void;
  onChangeSet: () => void;
}

function SetMark({ code }: { code: string }) {
  return (
    <img
      className="ac-setbar__mark"
      src={`/images/set_${code}.png`}
      alt={`${code} logo`}
      style={{ height: 28 }}
    />
  );
}

// Source-set picker (§5.1 / §5.4): defaults to base sets only; a header
// toggle (same idea as FilterPanel's Set dropdown) reveals all sets,
// including long-tail container sets (Weekly Play, Judge, Convention, etc.)
// as selectable source sets.
export function AddCardsSetBar({ sets, setCode, onChoose, onChangeSet }: Props) {
  const [showAllSets, setShowAllSets] = useState(false);

  if (!setCode) {
    const visibleSets = sets
      .filter((s) => showAllSets || s.is_base_set)
      .slice()
      .sort((a, b) => Number(b.is_base_set) - Number(a.is_base_set));

    return (
      <div className="ac-setbar">
        <span className="ac-setbar__label">Set</span>
        <div className="ac-setbar__select">
          <select
            className="ac-select"
            value=""
            onChange={(e) => e.target.value && onChoose(e.target.value)}
            autoFocus
          >
            <option value="">Select a set to begin…</option>
            {visibleSets.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="ac-setbar__change"
          onClick={() => setShowAllSets((v) => !v)}
        >
          {showAllSets ? "Base sets only" : "Show all sets"}
        </button>
      </div>
    );
  }

  const set = sets.find((s) => s.code === setCode);
  return (
    <div className="ac-setbar">
      <SetMark code={setCode} />
      <span className="ac-setbar__locked">
        <span className="ac-setbar__locked-code">{setCode}</span>
        {set ? set.name : setCode}
      </span>
      <button type="button" className="ac-setbar__change" onClick={onChangeSet}>
        Change set
      </button>
    </div>
  );
}
