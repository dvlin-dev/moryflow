/**
 * [PROVIDES]: useGitHubStars hook — fetches star count from internal API
 * [DEPENDS]: /api/v1/github-stars
 * [POS]: Client hook for GitHub star count display
 */

import { useState, useEffect } from 'react';

export function useGitHubStars(): number | null {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/v1/github-stars')
      .then((res) => res.json())
      .then((data: { stars?: number }) => {
        if (typeof data.stars === 'number') setStars(data.stars);
      })
      .catch(() => {});
  }, []);

  return stars;
}

export function formatStarCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}
