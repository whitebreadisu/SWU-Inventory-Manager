const ASPECT_IMAGES: Record<string, string> = {
  Command:    '/images/SWH_Aspects_Command.png',
  Aggression: '/images/SWH_Aspects_Aggression.png',
  Cunning:    '/images/SWH_Aspects_Cunning.png',
  Vigilance:  '/images/SWH_Aspects_Vigilance.png',
  Heroism:    '/images/SWH_Aspects_Heroism.png',
  Villainy:   '/images/SWH_Aspects_Villainy.png',
};

interface Props {
  aspect: string;
  size?: number;
}

export function AspectIcon({ aspect, size = 24 }: Props) {
  const src = ASPECT_IMAGES[aspect];
  if (!src) return null;

  return (
    <img
      src={src}
      alt={aspect}
      title={aspect}
      width={size}
      height={size}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    />
  );
}
