const ASPECTS: Record<string, { fill: string; stroke: string }> = {
  Command:    { fill: '#16a34a', stroke: '#15803d' },
  Aggression: { fill: '#dc2626', stroke: '#b91c1c' },
  Cunning:    { fill: '#ca8a04', stroke: '#a16207' },
  Vigilance:  { fill: '#0369a1', stroke: '#075985' },
  Heroism:    { fill: '#94a3b8', stroke: '#64748b' },
  Villainy:   { fill: '#7e22ce', stroke: '#6b21a8' },
};

interface Props {
  aspect: string;
  size?: number;
}

export function AspectIcon({ aspect, size = 24 }: Props) {
  const config = ASPECTS[aspect];
  if (!config) return null;

  const h = size;
  const m = h / 2;
  const pad = h * 0.08;

  // Diamond points: top, right, bottom, left
  const pts = `${m},${pad} ${h - pad},${m} ${m},${h - pad} ${pad},${m}`;

  return (
    <svg width={h} height={h} viewBox={`0 0 ${h} ${h}`} title={aspect} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polygon points={pts} fill={config.fill} stroke={config.stroke} strokeWidth="1" />
    </svg>
  );
}
