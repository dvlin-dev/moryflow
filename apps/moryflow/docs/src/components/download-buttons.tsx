'use client';

import { useState } from 'react';
import {
  moryflowPublicDownloads,
  moryflowPublicRelease,
  type MoryflowPublicDownloadPlatform,
} from '../../../shared/public-download';

type DownloadState = 'idle' | 'preparing' | 'downloading';

interface DownloadButtonsProps {
  locale?: 'zh' | 'en';
}

const texts = {
  zh: {
    sectionTitle: '当前公开下载',
    mac: '下载',
    windowsSoon: 'Windows 版本即将恢复',
    windowsDesc: '当前公开下载仅提供 macOS Apple Silicon 与 Intel 版本',
    preparing: '准备下载...',
    started: '下载已开始',
    version: '当前公开版本',
    channel: '通道',
    releaseNotes: '查看 Release Notes',
    allReleases: '查看所有版本',
    updateSource: '应用内自动更新使用 download.moryflow.com；网页手动下载使用 GitHub Releases。',
  },
  en: {
    sectionTitle: 'Current public download',
    mac: 'Download',
    windowsSoon: 'Windows is coming back soon',
    windowsDesc: 'Public downloads currently ship only for macOS on Apple Silicon and Intel.',
    preparing: 'Preparing...',
    started: 'Download started',
    version: 'Current public version',
    channel: 'Channel',
    releaseNotes: 'View release notes',
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

  const handleDownload = async (platform: MoryflowPublicDownloadPlatform) => {
    const info = moryflowPublicDownloads.find((item) => item.id === platform);
    if (!info) return;

    setDownloadStates((prev) => ({ ...prev, [platform]: 'preparing' }));
    await new Promise((r) => setTimeout(r, 300));

    const link = document.createElement('a');
    link.href = info.manualDownloadUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadStates((prev) => ({ ...prev, [platform]: 'downloading' }));
    setTimeout(() => {
      setDownloadStates((prev) => ({ ...prev, [platform]: 'idle' }));
    }, 3000);
  };

  const getButtonText = (platform: MoryflowPublicDownloadPlatform) => {
    const state = downloadStates[platform];
    if (state === 'preparing') return t.preparing;
    if (state === 'downloading') return `✓ ${t.started}`;
    return t.mac;
  };

  return (
    <div className="my-6 not-prose space-y-4">
      <div className="space-y-1">
        <div className="text-sm font-medium text-fd-foreground">{t.sectionTitle}</div>
        <div className="text-xs text-fd-muted-foreground">
          {t.version}: v{moryflowPublicRelease.version} · {t.channel}:{' '}
          {moryflowPublicRelease.channelLabel}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {moryflowPublicDownloads.map((download) => (
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

      <div className="rounded-xl border border-dashed border-fd-border bg-fd-card/60 px-4 py-3">
        <div className="text-sm font-medium text-fd-foreground">{t.windowsSoon}</div>
        <div className="mt-1 text-sm text-fd-muted-foreground">{t.windowsDesc}</div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <a
          href={moryflowPublicRelease.releaseNotesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-fd-primary hover:underline"
        >
          {t.releaseNotes}
        </a>
        <a
          href={moryflowPublicRelease.allReleasesUrl}
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
