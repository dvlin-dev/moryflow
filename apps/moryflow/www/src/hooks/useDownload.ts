/**
 * [PROVIDES]: 公开下载版本信息和下载动作
 * [DEPENDS]: apps/moryflow/shared/public-download.ts
 * [POS]: 下载功能 Hook，供官网下载入口使用
 */

import { useCallback } from 'react';
import {
  getMoryflowPublicDownloadOption,
  moryflowPublicDownloads,
  moryflowPublicRelease,
  type MoryflowPublicDownloadOption,
  type MoryflowPublicDownloadPlatform,
} from '../../../shared/public-download';
import { triggerManualDownload } from '../../../shared/manual-download';

interface UseDownloadReturn {
  version: string;
  channel: 'stable' | 'beta';
  channelLabel: string;
  releaseUrl: string;
  releaseNotesUrl: string;
  allReleasesUrl: string;
  downloads: readonly MoryflowPublicDownloadOption[];
  getDownloadInfo: (
    platform: MoryflowPublicDownloadPlatform
  ) => MoryflowPublicDownloadOption | null;
  startDownload: (platform: MoryflowPublicDownloadPlatform) => Promise<boolean>;
}

export function useDownload(): UseDownloadReturn {
  const startDownload = useCallback(async (platform: MoryflowPublicDownloadPlatform) => {
    const info = getMoryflowPublicDownloadOption(platform);
    if (!info) return false;

    triggerManualDownload(info.manualDownloadUrl);
    return true;
  }, []);

  return {
    version: moryflowPublicRelease.version,
    channel: moryflowPublicRelease.channel,
    channelLabel: moryflowPublicRelease.channelLabel,
    releaseUrl: moryflowPublicRelease.releaseUrl,
    releaseNotesUrl: moryflowPublicRelease.releaseNotesUrl,
    allReleasesUrl: moryflowPublicRelease.allReleasesUrl,
    downloads: moryflowPublicDownloads,
    getDownloadInfo: getMoryflowPublicDownloadOption,
    startDownload,
  };
}
