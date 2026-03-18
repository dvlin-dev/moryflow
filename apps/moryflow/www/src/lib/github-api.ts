/**
 * [PROVIDES]: GitHub API integrations (stars count, latest release)
 * [DEPENDS]: GitHub REST API
 * [POS]: Server-side cached proxies to avoid client-side rate limits
 */

import type { MoryflowPublicDownloadPlatform } from '../../../shared/public-download';

// ── Types ──

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  assets: GitHubAsset[];
}

export interface LatestReleaseData {
  version: string;
  tag: string;
  releaseUrl: string;
  releaseNotesUrl: string;
  allReleasesUrl: string;
  assets: Partial<Record<MoryflowPublicDownloadPlatform, string>>;
}

// ── GitHub Stars ──

let starCache: { stars: number; fetchedAt: number } | null = null;
const STARS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function fetchGitHubStars(): Promise<{ stars: number } | null> {
  if (starCache && Date.now() - starCache.fetchedAt < STARS_CACHE_TTL) {
    return { stars: starCache.stars };
  }

  try {
    const res = await fetch('https://api.github.com/repos/dvlin-dev/moryflow', {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (!res.ok) {
      return starCache ? { stars: starCache.stars } : null;
    }

    const data = (await res.json()) as { stargazers_count?: number };
    const stars = data.stargazers_count ?? 0;
    starCache = { stars, fetchedAt: Date.now() };
    return { stars };
  } catch {
    return starCache ? { stars: starCache.stars } : null;
  }
}

// ── Latest Release ──

const GITHUB_RELEASES_URL = 'https://api.github.com/repos/dvlin-dev/moryflow/releases?per_page=20';
const ALL_RELEASES_URL = 'https://github.com/dvlin-dev/moryflow/releases';
const RELEASE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

let releaseCache: { data: LatestReleaseData; fetchedAt: number } | null = null;

function parseAssets(
  assets: GitHubAsset[]
): Partial<Record<MoryflowPublicDownloadPlatform, string>> {
  const result: Partial<Record<MoryflowPublicDownloadPlatform, string>> = {};
  for (const asset of assets) {
    const name = asset.name.toLowerCase();
    if (name.endsWith('-arm64.dmg')) {
      result['darwin-arm64'] = asset.browser_download_url;
    } else if (name.endsWith('-x64.dmg')) {
      result['darwin-x64'] = asset.browser_download_url;
    }
  }
  return result;
}

export async function fetchLatestRelease(): Promise<LatestReleaseData | null> {
  if (releaseCache && Date.now() - releaseCache.fetchedAt < RELEASE_CACHE_TTL) {
    return releaseCache.data;
  }

  try {
    const res = await fetch(GITHUB_RELEASES_URL, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (!res.ok) {
      if (releaseCache) return releaseCache.data;
      return null;
    }

    const releases = (await res.json()) as GitHubRelease[];
    const release = releases.find((r) => !r.draft && !r.prerelease);

    if (!release) {
      if (releaseCache) return releaseCache.data;
      return null;
    }

    const version = release.tag_name.startsWith('v') ? release.tag_name.slice(1) : release.tag_name;
    const assets = parseAssets(release.assets);

    const data: LatestReleaseData = {
      version,
      tag: release.tag_name,
      releaseUrl: release.html_url,
      releaseNotesUrl: release.html_url,
      allReleasesUrl: ALL_RELEASES_URL,
      assets,
    };

    releaseCache = { data, fetchedAt: Date.now() };
    return data;
  } catch {
    if (releaseCache) return releaseCache.data;
    return null;
  }
}
