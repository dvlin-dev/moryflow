'use client';

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { getCanonicalUrl, getPageMeta } from '@/lib/seo';
import { JsonLd, createWebPageSchema } from '@/components/seo/JsonLd';
import { Download, Apple, Computer, Loader, CircleCheck } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { useDownload } from '@/hooks/useDownload';
import { usePlatformDetection, type Platform } from '@/lib/platform';
import { useLocale } from '@/routes/{-$locale}/route';
import { resolveLocale, t } from '@/lib/i18n';

export const Route = createFileRoute('/{-$locale}/download')({
  head: ({ params }) => {
    const locale = resolveLocale(params.locale);
    return getPageMeta({
      pageId: 'download',
      locale,
      title: t('meta.download.title', locale),
      description: t('meta.download.description', locale),
    });
  },
  component: DownloadPage,
});

type DownloadState = 'idle' | 'preparing' | 'downloading';

function DownloadPage() {
  const { version, isLoading, getDownloadInfo, startDownload } = useDownload();
  const [downloadStates, setDownloadStates] = useState<Record<Platform, DownloadState>>({
    mac: 'idle',
    win: 'idle',
  });
  const detected = usePlatformDetection();
  const locale = useLocale();
  const title = t('meta.download.title', locale);
  const description = t('meta.download.description', locale);

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

  return (
    <>
      <JsonLd
        data={createWebPageSchema({
          name: title,
          description,
          url: getCanonicalUrl('/download', locale),
        })}
      />
      <main className="pt-24 pb-20">
        {/* Hero */}
        <section className="px-4 sm:px-6 py-16 sm:py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-mory-text-primary mb-6">
              {t('download.title', locale)}
            </h1>
            <p className="text-lg sm:text-xl text-mory-text-secondary max-w-2xl mx-auto">
              {t('download.subtitle', locale)}
            </p>
          </div>
        </section>

        {/* Download Cards */}
        <section className="px-4 sm:px-6 py-8">
          <div className="container mx-auto max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* macOS */}
              <div
                className={`bg-mory-paper rounded-2xl p-8 border flex flex-col items-center text-center ${detected === 'mac' ? 'border-mory-orange shadow-mory-md' : 'border-mory-border'}`}
              >
                <div className="w-16 h-16 bg-mory-bg rounded-2xl flex items-center justify-center mb-5">
                  <Apple size={32} className="text-mory-text-primary" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-mory-text-primary mb-1">macOS</h3>
                <p className="text-sm text-mory-text-tertiary mb-6">
                  {t('download.macSub', locale)}
                </p>
                <Button
                  onClick={() => handleDownload('mac')}
                  disabled={isButtonDisabled('mac')}
                  className="w-full bg-mory-text-primary text-white hover:bg-black rounded-xl font-medium text-base py-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  data-track-cta="download-mac"
                >
                  {renderButtonContent('mac', t('download.mac', locale))}
                </Button>
              </div>

              {/* Windows */}
              <div
                className={`bg-mory-paper rounded-2xl p-8 border flex flex-col items-center text-center ${detected === 'win' ? 'border-mory-orange shadow-mory-md' : 'border-mory-border'}`}
              >
                <div className="w-16 h-16 bg-mory-bg rounded-2xl flex items-center justify-center mb-5">
                  <Computer size={32} className="text-mory-text-primary" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-mory-text-primary mb-1">
                  Windows
                </h3>
                <p className="text-sm text-mory-text-tertiary mb-6">
                  {t('download.winSub', locale)}
                </p>
                <Button
                  onClick={() => handleDownload('win')}
                  disabled={isButtonDisabled('win')}
                  className="w-full bg-mory-text-primary text-white hover:bg-black rounded-xl font-medium text-base py-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  data-track-cta="download-win"
                >
                  {renderButtonContent('win', t('download.win', locale))}
                </Button>
              </div>
            </div>

            <div className="text-center mt-6">
              <p className="text-sm text-mory-text-tertiary">
                {version
                  ? `${t('download.versionPrefix', locale)} ${version}`
                  : t('download.betaLabel', locale)}{' '}
                &middot; {t('download.freeBeta', locale)}
              </p>
            </div>
          </div>
        </section>

        {/* System Requirements */}
        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-bold text-mory-text-primary text-center mb-8">
              {t('download.sysReq', locale)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-mory-paper rounded-2xl p-6 border border-mory-border">
                <h3 className="font-bold text-mory-text-primary mb-4 flex items-center gap-2">
                  <Apple size={20} /> macOS
                </h3>
                <ul className="space-y-2 text-sm text-mory-text-secondary">
                  <li>{t('download.requirements.mac.os', locale)}</li>
                  <li>{t('download.requirements.mac.chip', locale)}</li>
                  <li>{t('download.requirements.mac.ram', locale)}</li>
                  <li>{t('download.requirements.mac.disk', locale)}</li>
                </ul>
              </div>
              <div className="bg-mory-paper rounded-2xl p-6 border border-mory-border">
                <h3 className="font-bold text-mory-text-primary mb-4 flex items-center gap-2">
                  <Computer size={20} /> Windows
                </h3>
                <ul className="space-y-2 text-sm text-mory-text-secondary">
                  <li>{t('download.requirements.win.os', locale)}</li>
                  <li>{t('download.requirements.win.chip', locale)}</li>
                  <li>{t('download.requirements.win.ram', locale)}</li>
                  <li>{t('download.requirements.win.disk', locale)}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
