import type { CardSet } from "../api/sets";

interface Props {
  sets: CardSet[];
  selectedCode: string;
  onChange: (code: string) => void;
}

export function SetSelector({ sets, selectedCode, onChange }: Props) {
  return (
    <select value={selectedCode} onChange={(e) => onChange(e.target.value)}>
      {sets.map((s) => (
        <option key={s.code} value={s.code}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
