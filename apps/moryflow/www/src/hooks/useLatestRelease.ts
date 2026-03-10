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

export function useLatestRelease(): { data: LatestReleaseData | null; isLoading: boolean } {
  const [data, setData] = useState<LatestReleaseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/latest-release')
      .then((res) => res.json())
      .then((json: LatestReleaseData | null) => {
        if (json && json.version) setData(json);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading };
}
