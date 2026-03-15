/**
 * [PROVIDES]: 公开下载版本信息和下载动作
 * [DEPENDS]: useLatestRelease, apps/moryflow/shared/public-download.ts
 * [POS]: 下载功能 Hook，供官网下载入口使用
 */

import { useCallback } from 'react';
import {
  getMoryflowPublicDownloadOption,
  moryflowPublicDownloads,
  allReleasesUrl,
  type MoryflowPublicDownloadOption,
  type MoryflowPublicDownloadPlatform,
} from '../../../shared/public-download';
import { triggerManualDownload } from '../../../shared/manual-download';
import { useLatestRelease } from './useLatestRelease';

interface UseDownloadReturn {
  version: string;
  releaseUrl: string;
  releaseNotesUrl: string;
  allReleasesUrl: string;
  isLoading: boolean;
  downloads: readonly MoryflowPublicDownloadOption[];
  getDownloadInfo: (
    platform: MoryflowPublicDownloadPlatform
  ) => MoryflowPublicDownloadOption | null;
  hasAssetUrl: (platform: MoryflowPublicDownloadPlatform) => boolean;
  startDownload: (platform: MoryflowPublicDownloadPlatform) => Promise<boolean>;
}

export function useDownload(): UseDownloadReturn {
  const { data, isLoading } = useLatestRelease();

  const startDownload = useCallback(
    async (platform: MoryflowPublicDownloadPlatform) => {
      const url = data?.assets[platform];
      if (!url) return false;
      triggerManualDownload(url);
      return true;
    },
    [data]
  );

  const hasAssetUrl = useCallback(
    (platform: MoryflowPublicDownloadPlatform) => !!data?.assets[platform],
    [data]
  );

  return {
    version: data?.version ?? '…',
    releaseUrl: data?.releaseUrl ?? allReleasesUrl,
    releaseNotesUrl: data?.releaseNotesUrl ?? allReleasesUrl,
    allReleasesUrl: data?.allReleasesUrl ?? allReleasesUrl,
    isLoading,
    downloads: moryflowPublicDownloads,
    getDownloadInfo: getMoryflowPublicDownloadOption,
    hasAssetUrl,
    startDownload,
  };
}
