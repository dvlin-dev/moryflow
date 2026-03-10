/**
 * [PROVIDES]: useLatestRelease hook — fetches latest release from internal API
 * [DEPENDS]: /api/v1/latest-release
 * [POS]: Client hook for dynamic release info (version, assets, URLs)
 */

import { useState, useEffect } from 'react';
import type { MoryflowPublicDownloadPlatform } from '../../../shared/public-download';

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

let moduleCache: {
  promise: Promise<LatestReleaseData | null>;
  result: LatestReleaseData | null;
} | null = null;

function fetchLatestRelease(): Promise<LatestReleaseData | null> {
  if (moduleCache) return moduleCache.promise;
  const promise = fetch('/api/v1/latest-release')
    .then((res) => (res.ok ? res.json() : null))
    .then((json: LatestReleaseData | null) => {
      const data = json && json.version ? json : null;
      if (data !== null) {
        if (moduleCache) moduleCache.result = data;
      } else {
        moduleCache = null;
      }
      return data;
    })
    .catch(() => {
      moduleCache = null;
      return null;
    });
  moduleCache = { promise, result: null };
  return promise;
}

export function useLatestRelease(): { data: LatestReleaseData | null; isLoading: boolean } {
  const [data, setData] = useState<LatestReleaseData | null>(moduleCache?.result ?? null);
  const [isLoading, setIsLoading] = useState(moduleCache?.result == null);

  useEffect(() => {
    fetchLatestRelease()
      .then((d) => {
        if (d !== null) setData(d);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading };
}
