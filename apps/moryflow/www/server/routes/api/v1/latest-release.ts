/**
 * [PROVIDES]: Latest MoryFlow release metadata from GitHub
 * [DEPENDS]: GitHub REST API (repos/dvlin-dev/moryflow/releases)
 * [POS]: Nitro server route — 10min cached proxy for dynamic release info
 */

import { defineEventHandler } from 'vinxi/http';

type MoryflowPublicDownloadPlatform = 'darwin-arm64' | 'darwin-x64';

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
  channel: 'stable' | 'beta';
  isPrerelease: boolean;
  releaseUrl: string;
  releaseNotesUrl: string;
  allReleasesUrl: string;
  assets: Partial<Record<MoryflowPublicDownloadPlatform, string>>;
}

const GITHUB_RELEASES_URL = 'https://api.github.com/repos/dvlin-dev/moryflow/releases?per_page=5';
const ALL_RELEASES_URL = 'https://github.com/dvlin-dev/moryflow/releases';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

let cached: { data: LatestReleaseData; fetchedAt: number } | null = null;

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

function parseVersion(tagName: string): { version: string; channel: 'stable' | 'beta' } {
  const version = tagName.startsWith('v') ? tagName.slice(1) : tagName;
  const channel = version.includes('beta') ? 'beta' : 'stable';
  return { version, channel };
}

export default defineEventHandler(async () => {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(GITHUB_RELEASES_URL, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (!res.ok) {
      if (cached) return cached.data;
      return null;
    }

    const releases = (await res.json()) as GitHubRelease[];
    const release = releases.find((r) => !r.draft);

    if (!release) {
      if (cached) return cached.data;
      return null;
    }

    const { version, channel } = parseVersion(release.tag_name);
    const assets = parseAssets(release.assets);

    const data: LatestReleaseData = {
      version,
      tag: release.tag_name,
      channel,
      isPrerelease: release.prerelease,
      releaseUrl: release.html_url,
      releaseNotesUrl: release.html_url,
      allReleasesUrl: ALL_RELEASES_URL,
      assets,
    };

    cached = { data, fetchedAt: Date.now() };
    return data;
  } catch {
    if (cached) return cached.data;
    return null;
  }
});
