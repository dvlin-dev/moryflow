'use client';

import { useState } from 'react';
import {
  moryflowPublicDownloads,
  allReleasesUrl,
  type MoryflowPublicDownloadPlatform,
} from '../../../shared/public-download';

type DownloadState = 'idle' | 'preparing' | 'downloading';

interface DownloadButtonsProps {
  locale?: 'zh' | 'en';
}

const texts = {
  zh: {
    sectionTitle: '当前公开下载',
    button: '下载',
    appleSilicon: 'macOS（Apple Silicon）',
    appleSiliconDesc: '适用于 M1、M2、M3、M4 及更新的 Apple Silicon Mac',
    intelMac: 'macOS（Intel）',
    intelMacDesc: '适用于受支持 macOS 版本的 Intel Mac',
    preparing: '准备下载...',
    started: '下载已开始',
    version: '最新版本',
    allReleases: '查看所有版本',
    updateSource: '应用内自动更新使用 download.moryflow.com；网页手动下载使用 GitHub Releases。',
  },
  en: {
    sectionTitle: 'Current public download',
    button: 'Download',
    appleSilicon: 'macOS (Apple Silicon)',
    appleSiliconDesc: 'M1, M2, M3, M4, and newer Apple Silicon Macs',
    intelMac: 'macOS (Intel)',
    intelMacDesc: 'Intel-based Macs running a supported version of macOS',
    preparing: 'Preparing...',
    started: 'Download started',
    version: 'Latest release',
    allReleases: 'View all releases',
    updateSource:
      'In-app automatic updates use download.moryflow.com; manual downloads use GitHub Releases.',
  },
} as const;

export function DownloadButtons({ locale = 'en' }: DownloadButtonsProps) {
  const [downloadStates, setDownloadStates] = useState<
    Record<MoryflowPublicDownloadPlatform, DownloadState>
  >({
    'darwin-arm64': 'idle',
    'darwin-x64': 'idle',
  });

  const t = texts[locale];
  const localizedDownloads = moryflowPublicDownloads.map((download) => ({
    ...download,
    shortLabel: download.id === 'darwin-arm64' ? t.appleSilicon : t.intelMac,
    description: download.id === 'darwin-arm64' ? t.appleSiliconDesc : t.intelMacDesc,
  }));

  const handleDownload = async (platform: MoryflowPublicDownloadPlatform) => {
    setDownloadStates((prev) => ({ ...prev, [platform]: 'preparing' }));
    await new Promise((r) => setTimeout(r, 300));

    // Redirect to the www download page which has platform-specific dynamic URLs
    const downloadPath = locale === 'zh' ? '/zh/download' : '/download';
    window.open(`https://www.moryflow.com${downloadPath}`, '_blank', 'noopener,noreferrer');
    setDownloadStates((prev) => ({ ...prev, [platform]: 'downloading' }));
    setTimeout(() => {
      setDownloadStates((prev) => ({ ...prev, [platform]: 'idle' }));
    }, 3000);
  };

  const getButtonText = (platform: MoryflowPublicDownloadPlatform) => {
    const state = downloadStates[platform];
    if (state === 'preparing') return t.preparing;
    if (state === 'downloading') return `✓ ${t.started}`;
    return t.button;
  };

  return (
    <div className="my-6 not-prose space-y-4">
      <div className="space-y-1">
        <div className="text-sm font-medium text-fd-foreground">{t.sectionTitle}</div>
        <div className="text-xs text-fd-muted-foreground">{t.version}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {localizedDownloads.map((download) => (
          <div key={download.id} className="rounded-xl border border-fd-border bg-fd-card p-4">
            <div className="font-medium text-fd-foreground">{download.shortLabel}</div>
            <div className="mt-1 text-sm text-fd-muted-foreground">{download.description}</div>
            <button
              onClick={() => handleDownload(download.id)}
              disabled={downloadStates[download.id] !== 'idle'}
              className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-fd-primary text-fd-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {getButtonText(download.id)}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <a
          href={allReleasesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-fd-primary hover:underline"
        >
          {t.allReleases}
        </a>
      </div>

      <div className="text-xs text-fd-muted-foreground">{t.updateSource}</div>
    </div>
  );
}

export default DownloadButtons;
