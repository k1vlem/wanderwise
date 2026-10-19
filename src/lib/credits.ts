import { useEffect, useState } from 'react';

export interface Credit {
  file: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
}

let request: Promise<Record<string, Credit>> | null = null;

/** Photo authors and licenses from public/photos/credits.json, loaded once per visit. */
export function usePhotoCredits(): Record<string, Credit> | null {
  const [credits, setCredits] = useState<Record<string, Credit> | null>(null);
  useEffect(() => {
    request ??= fetch(`${import.meta.env.BASE_URL}photos/credits.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
    let alive = true;
    request.then((c) => alive && setCredits(c));
    return () => {
      alive = false;
    };
  }, []);
  return credits;
}
