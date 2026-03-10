'use client';

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { getCanonicalUrl, getPageMeta } from '@/lib/seo';
import { JsonLd, createWebPageSchema } from '@/components/seo/JsonLd';
import { Download, Apple, CircleCheck, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { useDownload } from '@/hooks/useDownload';
import { useLocale } from '@/routes/{-$locale}/route';
import { resolveLocale, t } from '@/lib/i18n';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';
import { type MoryflowPublicDownloadPlatform } from '../../../../shared/public-download';

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
  const { version, channel, releaseNotesUrl, allReleasesUrl, getDownloadInfo, startDownload } =
    useDownload();
  const [downloadStates, setDownloadStates] = useState<
    Record<MoryflowPublicDownloadPlatform, DownloadState>
  >({
    'darwin-arm64': 'idle',
    'darwin-x64': 'idle',
  });
  const locale = useLocale();
  const title = t('meta.download.title', locale);
  const description = t('meta.download.description', locale);
  const channelLabel =
    channel === 'beta' ? t('download.betaLabel', locale) : t('download.stableLabel', locale);

  const heroRef = useScrollReveal<HTMLDivElement>({ animation: 'fade-up' });
  const cardsRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 120 });

  const downloadOptions: {
    id: MoryflowPublicDownloadPlatform;
    title: string;
    description: string;
  }[] = [
    {
      id: 'darwin-arm64',
      title: t('download.macAppleSilicon', locale),
      description: t('download.macAppleSiliconSub', locale),
    },
    {
      id: 'darwin-x64',
      title: t('download.macIntel', locale),
      description: t('download.macIntelSub', locale),
    },
  ];

  const handleDownload = async (platform: MoryflowPublicDownloadPlatform) => {
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
      return;
    }

    setDownloadStates((prev) => ({ ...prev, [platform]: 'idle' }));
  };

  const renderButtonContent = (platform: MoryflowPublicDownloadPlatform) => {
    const state = downloadStates[platform];
    switch (state) {
      case 'preparing':
        return (
          <>
            <Sparkles size={20} className="animate-pulse" />
            {t('download.preparing', locale)}
          </>
        );
      case 'downloading':
        return (
          <>
            <CircleCheck size={20} className="text-success" />
            {t('download.started', locale)}
          </>
        );
      default:
        return (
          <>
            <Download size={20} />
            {t('download.button', locale)}
          </>
        );
    }
  };

  const isButtonDisabled = (platform: MoryflowPublicDownloadPlatform) =>
    downloadStates[platform] !== 'idle' || !getDownloadInfo(platform);

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
        <section className="relative px-4 sm:px-6 py-16 sm:py-24 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'var(--gradient-hero-glow)' }}
          />
          <div ref={heroRef} className="container relative mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight">
              {t('download.title', locale)}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('download.subtitle', locale)}
            </p>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-8">
          <div className="container mx-auto max-w-5xl">
            <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {downloadOptions.map((option) => (
                <div
                  key={option.id}
                  data-reveal-item
                  className="bg-card rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mb-5">
                    <Apple size={32} className="text-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-1 tracking-tight">
                    {option.title}
                  </h2>
                  <p className="text-sm text-tertiary mb-6">{option.description}</p>
                  <Button
                    onClick={() => handleDownload(option.id)}
                    disabled={isButtonDisabled(option.id)}
                    className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-xl font-medium text-base py-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
                    data-track-cta={`download-${option.id}`}
                  >
                    {renderButtonContent(option.id)}
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-card shadow-xs px-6 py-5">
              <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                <span>
                  {t('download.currentPublicVersion', locale)}:{' '}
                  {t('download.versionPrefix', locale)}
                  {version}
                </span>
                <span className="hidden sm:inline">&middot;</span>
                <span>
                  {t('download.channel', locale)}: {channelLabel}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
                <a
                  href={releaseNotesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-foreground hover:text-brand transition-colors"
                >
                  <ExternalLink size={16} />
                  {t('download.releaseNotes', locale)}
                </a>
                <a
                  href={allReleasesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-foreground hover:text-brand transition-colors"
                >
                  <ExternalLink size={16} />
                  {t('download.allReleases', locale)}
                </a>
              </div>

              <p className="mt-4 text-center text-xs text-tertiary">
                {t('download.manualVsAuto', locale)}
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-16">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8 tracking-tight">
              {t('download.sysReq', locale)}
            </h2>
            <div className="max-w-md mx-auto">
              <div className="bg-card rounded-2xl p-6 shadow-xs">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Apple size={20} /> macOS
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>{t('download.requirements.mac.os', locale)}</li>
                  <li>{t('download.requirements.mac.chip', locale)}</li>
                  <li>{t('download.requirements.mac.ram', locale)}</li>
                  <li>{t('download.requirements.mac.disk', locale)}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
