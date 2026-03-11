/**
 * [PROVIDES]: GitHub star count for dvlin-dev/moryflow
 * [DEPENDS]: GitHub REST API
 * [POS]: Nitro server route — 1h cached proxy to avoid client-side rate limits
 */

import { defineEventHandler } from 'vinxi/http';

let cached: { stars: number; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export default defineEventHandler(async () => {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return { stars: cached.stars };
  }

  try {
    const res = await fetch('https://api.github.com/repos/dvlin-dev/moryflow', {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (!res.ok) {
      return cached ? { stars: cached.stars } : null;
    }

    const data = (await res.json()) as { stargazers_count?: number };
    const stars = data.stargazers_count ?? 0;
    cached = { stars, fetchedAt: Date.now() };
    return { stars };
  } catch {
    return cached ? { stars: cached.stars } : null;
  }
});
