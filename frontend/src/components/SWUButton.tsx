// Polygon paths derived from the official starwarsunlimited.com button SVGs
// viewBox "0 0 86.67 150.43" — main shape ends at y=124.75, shadow below that
const MAIN_BOTTOM = 124.75;
const TOTAL_H = 150.43;
const CAP_W = 86.67;
const MAIN_PCT = (MAIN_BOTTOM / TOTAL_H) * 100; // ~82.93%

const SIZES = { sm: 40, md: 52, lg: 64 } as const;

interface Props {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  size?: keyof typeof SIZES;
}

export function SWUButton({ children, active = true, onClick, size = 'sm' }: Props) {
  const h = SIZES[size];
  const capW = Math.round(CAP_W * h / TOTAL_H);
  const fill = active ? '#2563eb' : '#2d3748';
  const shadow = active ? '#e6e6e6' : '#374151';
  const shadowPb = ((TOTAL_H - MAIN_BOTTOM) / TOTAL_H) * h;

  return (
    <button
      onClick={onClick}
      style={{ display: 'inline-flex', height: h, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', alignItems: 'stretch' }}
    >
      <svg width={capW} height={h} viewBox="0 0 86.67 150.43" preserveAspectRatio="none" style={{ display: 'block', flexShrink: 0 }}>
        <polygon fill={fill} points="55.43,8 18.27,81.65 50.59,124.75 86.67,124.75 86.67,8" />
      </svg>

      <span
        className="swu-btn__label"
        style={{
          flex: 1,
          paddingBottom: shadowPb,
          background: `linear-gradient(to bottom, ${fill} ${MAIN_PCT}%, transparent ${MAIN_PCT}%)`,
          fontSize: size === 'lg' ? 18 : size === 'md' ? 15 : 13,
        }}
      >
        {children}
      </span>

      <svg width={capW} height={h} viewBox="0 0 86.67 150.43" preserveAspectRatio="none" style={{ display: 'block', flexShrink: 0 }}>
        <polygon fill={fill} points="36.08,124.75 68.4,81.65 31.24,8 0,8 0,124.75" />
        <polygon fill={shadow} points="86.67,100.09 82.65,92.12 44.92,142.43 0,142.43 0,150.43 48.92,150.43" />
      </svg>
    </button>
  );
}
