/**
 * [PROVIDES]: 下载版本信息和下载操作
 * [DEPENDS]: 无外部依赖
 * [POS]: 下载功能 Hook，供 DownloadCTA 使用
 */

import { useState, useEffect, useCallback } from 'react';
import { createApiClient, createApiTransport } from '@anyhunt/api/client';

const DOWNLOAD_BASE = 'https://download.moryflow.com';
const downloadClient = createApiClient({
  transport: createApiTransport({
    baseUrl: DOWNLOAD_BASE,
  }),
  defaultAuthMode: 'public',
});

type Platform = 'mac' | 'win' | 'linux';

interface DownloadInfo {
  filename: string;
  url: string;
}

interface Manifest {
  version: string;
  releaseDate: string;
  downloads: {
    'mac-arm64': { filename: string; cloudflare: string };
    'win-x64': { filename: string; cloudflare: string };
    'linux-x64': { filename: string; cloudflare: string };
  };
}

interface UseDownloadReturn {
  version: string | null;
  isLoading: boolean;
  getDownloadInfo: (platform: Platform) => DownloadInfo | null;
  startDownload: (platform: Platform) => Promise<boolean>;
}

const PLATFORM_MAP: Record<Platform, keyof Manifest['downloads']> = {
  mac: 'mac-arm64',
  win: 'win-x64',
  linux: 'linux-x64',
};

export function useDownload(): UseDownloadReturn {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchManifest = async () => {
      try {
        const data = await downloadClient.get<Manifest>('/manifest.json', {
          query: { _t: Date.now() },
        });
        setManifest(data);
      } catch (err) {
        console.error('Failed to fetch manifest:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchManifest();
  }, []);

  const getDownloadInfo = useCallback(
    (platform: Platform): DownloadInfo | null => {
      if (!manifest) return null;

      const key = PLATFORM_MAP[platform];
      const info = manifest.downloads[key];

      if (!info?.filename || !info?.cloudflare) return null;

      return {
        filename: info.filename,
        url: info.cloudflare,
      };
    },
    [manifest]
  );

  const startDownload = useCallback(
    async (platform: Platform): Promise<boolean> => {
      const info = getDownloadInfo(platform);
      if (!info) return false;

      const link = document.createElement('a');
      link.href = info.url;
      link.download = info.filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return true;
    },
    [getDownloadInfo]
  );

  return {
    version: manifest?.version ?? null,
    isLoading,
    getDownloadInfo,
    startDownload,
  };
}
