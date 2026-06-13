import type { CardSet } from '../../api/sets';

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

export function AddCardsSetBar({ sets, setCode, onChoose, onChangeSet }: Props) {
  if (!setCode) {
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
            {sets.map((s) => (
              <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  const set = sets.find(s => s.code === setCode);
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
