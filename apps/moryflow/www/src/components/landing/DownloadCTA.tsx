/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Final CTA section — OS-aware download buttons with clean layout
 */

'use client';

import { useState } from 'react';
import { Download, Apple, Computer, Loader, CircleCheck } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { useDownload } from '../../hooks/useDownload';
import { usePlatformDetection, type Platform } from '@/lib/platform';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';

type DownloadState = 'idle' | 'preparing' | 'downloading';

export function DownloadCTA() {
  const { version, isLoading, getDownloadInfo, startDownload } = useDownload();
  const [downloadStates, setDownloadStates] = useState<Record<Platform, DownloadState>>({
    mac: 'idle',
    win: 'idle',
  });
  const detected = usePlatformDetection();
  const locale = useLocale();

  const handleDownload = async (platform: Platform) => {
    const info = getDownloadInfo(platform);
    if (!info) return;

    setDownloadStates((prev) => ({ ...prev, [platform]: 'preparing' }));
    await new Promise((resolve) => setTimeout(resolve, 300));

    const success = await startDownload(platform);
    if (success) {
      setDownloadStates((prev) => ({ ...prev, [platform]: 'downloading' }));
      setTimeout(() => {
        setDownloadStates((prev) => ({ ...prev, [platform]: 'idle' }));
      }, 3000);
    } else {
      setDownloadStates((prev) => ({ ...prev, [platform]: 'idle' }));
    }
  };

  const renderButtonContent = (platform: Platform, label: string) => {
    const state = downloadStates[platform];
    if (isLoading) {
      return (
        <>
          <Loader size={20} className="animate-spin" />
          {t('download.loading', locale)}
        </>
      );
    }
    switch (state) {
      case 'preparing':
        return (
          <>
            <Loader size={20} className="animate-spin" />
            {t('download.preparing', locale)}
          </>
        );
      case 'downloading':
        return (
          <>
            <CircleCheck size={20} className="text-green-500" />
            {t('download.started', locale)}
          </>
        );
      default:
        return (
          <>
            <Download size={20} />
            {label}
          </>
        );
    }
  };

  const isButtonDisabled = (platform: Platform) => {
    return isLoading || downloadStates[platform] !== 'idle' || !getDownloadInfo(platform);
  };

  // Order platforms: detected first
  const platforms: { key: Platform; icon: typeof Apple; label: string; sub: string }[] = [
    {
      key: 'mac',
      icon: Apple,
      label: t('download.mac', locale),
      sub: t('download.macSub', locale),
    },
    {
      key: 'win',
      icon: Computer,
      label: t('download.win', locale),
      sub: t('download.winSub', locale),
    },
  ];
  if (detected === 'win') platforms.reverse();

  return (
    <section id="download" className="py-24 sm:py-32 px-4 sm:px-6 scroll-mt-20">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-mory-text-primary mb-4">
          {t('downloadCta.title', locale)}
        </h2>
        <p className="text-mory-text-secondary mb-12 max-w-xl mx-auto">
          {t('downloadCta.desc', locale)}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
          {platforms.map(({ key, icon: Icon, label, sub }) => (
            <div
              key={key}
              className="bg-mory-paper rounded-2xl p-8 border border-mory-border hover:shadow-mory-md transition-shadow flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-mory-bg rounded-2xl flex items-center justify-center mb-5">
                <Icon size={32} className="text-mory-text-primary" />
              </div>
              <Button
                onClick={() => handleDownload(key)}
                disabled={isButtonDisabled(key)}
                className="w-full bg-mory-text-primary text-white hover:bg-black rounded-xl font-medium text-base py-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                data-track-cta={`final-download-${key}`}
              >
                {renderButtonContent(key, label)}
              </Button>
              <p className="mt-3 text-xs text-mory-text-tertiary">{sub}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-mory-text-tertiary">
          {version
            ? `${t('download.versionPrefix', locale)} ${version}`
            : t('download.betaLabel', locale)}{' '}
          &middot; {t('downloadCta.freeForever', locale)}
        </p>
      </div>
    </section>
  );
}
