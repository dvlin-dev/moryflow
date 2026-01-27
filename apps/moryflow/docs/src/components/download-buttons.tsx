'use client';

import { useState, useEffect } from 'react';

const DOWNLOAD_BASE = 'https://download.moryflow.com';

interface Manifest {
  version: string;
  downloads: {
    'mac-arm64': { filename: string; cloudflare: string };
    'win-x64': { filename: string; cloudflare: string };
  };
}

type Platform = 'mac' | 'win';
type DownloadState = 'idle' | 'preparing' | 'downloading';

interface DownloadButtonsProps {
  locale?: 'zh' | 'en';
}

const texts = {
  zh: {
    mac: '下载 macOS 版',
    win: '下载 Windows 版',
    macDesc: 'Apple Silicon (M1/M2/M3)',
    winDesc: 'Windows 10/11 (64-bit)',
    loading: '加载中...',
    preparing: '准备下载...',
    started: '下载已开始',
    version: '当前版本',
  },
  en: {
    mac: 'Download for macOS',
    win: 'Download for Windows',
    macDesc: 'Apple Silicon (M1/M2/M3)',
    winDesc: 'Windows 10/11 (64-bit)',
    loading: 'Loading...',
    preparing: 'Preparing...',
    started: 'Download started',
    version: 'Current version',
  },
};

export function DownloadButtons({ locale = 'en' }: DownloadButtonsProps) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadStates, setDownloadStates] = useState<Record<Platform, DownloadState>>({
    mac: 'idle',
    win: 'idle',
  });

  const t = texts[locale];

  useEffect(() => {
    fetch(`${DOWNLOAD_BASE}/manifest.json?_t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => setManifest(data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleDownload = async (platform: Platform) => {
    if (!manifest) return;

    const key = platform === 'mac' ? 'mac-arm64' : 'win-x64';
    const info = manifest.downloads[key];
    if (!info?.cloudflare) return;

    setDownloadStates((prev) => ({ ...prev, [platform]: 'preparing' }));
    await new Promise((r) => setTimeout(r, 300));

    const link = document.createElement('a');
    link.href = info.cloudflare;
    link.download = info.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadStates((prev) => ({ ...prev, [platform]: 'downloading' }));
    setTimeout(() => {
      setDownloadStates((prev) => ({ ...prev, [platform]: 'idle' }));
    }, 3000);
  };

  const getButtonText = (platform: Platform, label: string) => {
    if (isLoading) return t.loading;
    const state = downloadStates[platform];
    if (state === 'preparing') return t.preparing;
    if (state === 'downloading') return `✓ ${t.started}`;
    return label;
  };

  const isDisabled = (platform: Platform) => {
    return isLoading || downloadStates[platform] !== 'idle';
  };

  return (
    <div className="my-6 not-prose">
      <div className="flex flex-wrap gap-4 mb-4">
        <button
          onClick={() => handleDownload('mac')}
          disabled={isDisabled('mac')}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium rounded-lg bg-fd-primary text-fd-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed min-w-[200px]"
        >
          <Apple className="size-5" />
          {getButtonText('mac', t.mac)}
        </button>

        <button
          onClick={() => handleDownload('win')}
          disabled={isDisabled('win')}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium rounded-lg bg-fd-secondary text-fd-secondary-foreground border border-fd-border hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed min-w-[200px]"
        >
          <WindowsIcon className="size-5" />
          {getButtonText('win', t.win)}
        </button>
      </div>

      <div className="text-sm text-fd-muted-foreground">
        <span className="mr-6">macOS: {t.macDesc}</span>
        <span>Windows: {t.winDesc}</span>
      </div>

      {manifest?.version && (
        <div className="text-xs text-fd-muted-foreground mt-2">
          {t.version}: v{manifest.version}
        </div>
      )}
    </div>
  );
}

function Apple({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm7 .25l10 .15V21l-10-1.91V13.25z" />
    </svg>
  );
}

export default DownloadButtons;
