import { useState } from 'react';
import { photoUrl } from '../data';

// Where to anchor the crop for photos whose subject is off-centre.
const FOCUS: Record<string, string> = {
  hero: '70% 50%',
  paris: '50% 35%',
  utrecht: '50% 60%',
  lisbon: '50% 45%',
  santorini: '50% 60%',
};

interface Props {
  id: string;
  alt: string;
  size?: 'sm' | 'lg';
  className?: string;
  eager?: boolean;
}

/** A photo from public/photos. If it fails to load, a warm gradient takes its place. */
export function Photo({ id, alt, size = 'sm', className = '', eager }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div role="img" aria-label={alt} className={`bg-gradient-to-br from-sand via-sunset/60 to-ink-soft ${className}`} />;
  }
  return (
    <img
      src={photoUrl(id, size)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      style={{ objectPosition: FOCUS[id] ?? '50% 50%' }}
      className={`object-cover ${className}`}
    />
  );
}
