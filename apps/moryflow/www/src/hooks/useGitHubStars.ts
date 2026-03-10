/**
 * [PROVIDES]: useGitHubStars hook — fetches star count from internal API
 * [DEPENDS]: /api/v1/github-stars
 * [POS]: Client hook for GitHub star count display
 */

import { useState, useEffect } from 'react';

let moduleCache: { promise: Promise<number | null>; result: number | null } | null = null;

function fetchStars(): Promise<number | null> {
  if (moduleCache) return moduleCache.promise;
  const promise = fetch('/api/v1/github-stars')
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { stars?: number } | null) => {
      const stars = typeof data?.stars === 'number' ? data.stars : null;
      if (moduleCache) moduleCache.result = stars;
      return stars;
    })
    .catch(() => null);
  moduleCache = { promise, result: null };
  return promise;
}

export function useGitHubStars(): number | null {
  const [stars, setStars] = useState<number | null>(moduleCache?.result ?? null);

  useEffect(() => {
    fetchStars().then((s) => {
      if (s !== null) setStars(s);
    });
  }, []);

  return stars;
}

export function formatStarCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}
