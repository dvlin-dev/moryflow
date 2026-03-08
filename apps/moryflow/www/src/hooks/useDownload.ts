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

interface UseDownloadReturn {
  version: string;
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

    const link = document.createElement('a');
    link.href = info.manualDownloadUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  }, []);

  return {
    version: moryflowPublicRelease.version,
    channelLabel: moryflowPublicRelease.channelLabel,
    releaseUrl: moryflowPublicRelease.releaseUrl,
    releaseNotesUrl: moryflowPublicRelease.releaseNotesUrl,
    allReleasesUrl: moryflowPublicRelease.allReleasesUrl,
    downloads: moryflowPublicDownloads,
    getDownloadInfo: getMoryflowPublicDownloadOption,
    startDownload,
  };
}
