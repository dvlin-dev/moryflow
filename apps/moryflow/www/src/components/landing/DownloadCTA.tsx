/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Final CTA section — download with brand glow and enhanced card interactions
 */

'use client';

import { useState } from 'react';
import { Download, Apple, Computer, Sparkles, CircleCheck, ExternalLink } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { useDownload } from '../../hooks/useDownload';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { useScrollReveal, useScrollRevealGroup } from '@/hooks/useScrollReveal';
import { type MoryflowPublicDownloadPlatform } from '../../../../shared/public-download';

type DownloadState = 'idle' | 'preparing' | 'downloading';

export function DownloadCTA() {
  const { version, channel, getDownloadInfo, startDownload, releaseNotesUrl } = useDownload();
  const [downloadStates, setDownloadStates] = useState<
    Record<MoryflowPublicDownloadPlatform, DownloadState>
  >({
    'darwin-arm64': 'idle',
    'darwin-x64': 'idle',
  });
  const locale = useLocale();
  const headingRef = useScrollReveal<HTMLHeadingElement>({ animation: 'fade-up' });
  const gridRef = useScrollRevealGroup<HTMLDivElement>({ stagger: 120 });

  const downloadOptions: {
    id: MoryflowPublicDownloadPlatform;
    icon: typeof Apple;
    label: string;
    sub: string;
  }[] = [
    {
      id: 'darwin-arm64',
      icon: Apple,
      label: t('download.macAppleSilicon', locale),
      sub: t('download.macAppleSiliconSub', locale),
    },
    {
      id: 'darwin-x64',
      icon: Apple,
      label: t('download.macIntel', locale),
      sub: t('download.macIntelSub', locale),
    },
  ];

  const channelLabel =
    channel === 'beta' ? t('download.betaLabel', locale) : t('download.stableLabel', locale);

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
    } else {
      setDownloadStates((prev) => ({ ...prev, [platform]: 'idle' }));
    }
  };

  const renderButtonContent = (platform: MoryflowPublicDownloadPlatform, label: string) => {
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
            {label}
          </>
        );
    }
  };

  const isButtonDisabled = (platform: MoryflowPublicDownloadPlatform) => {
    return downloadStates[platform] !== 'idle' || !getDownloadInfo(platform);
  };

  return (
    <section
      id="download"
      className="relative py-24 sm:py-32 px-4 sm:px-6 scroll-mt-20 overflow-hidden"
    >
      {/* Subtle glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(600px circle at 50% 50%, rgba(124, 92, 252, 0.05), transparent 70%)',
        }}
      />

      <div className="container relative mx-auto max-w-5xl text-center">
        <h2
          ref={headingRef}
          className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight"
        >
          {t('downloadCta.title', locale)}
        </h2>
        <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">
          {t('downloadCta.desc', locale)}
        </p>

        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-6">
          {downloadOptions.map(({ id, icon: Icon, label, sub }) => (
            <div
              key={id}
              data-reveal-item
              className="bg-card rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mb-5">
                <Icon size={32} className="text-foreground" />
              </div>
              <Button
                onClick={() => handleDownload(id)}
                disabled={isButtonDisabled(id)}
                className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-xl font-medium text-base py-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
                data-track-cta={`final-download-${id}`}
              >
                {renderButtonContent(id, label)}
              </Button>
              <p className="mt-3 text-xs text-tertiary">{sub}</p>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto rounded-2xl border border-dashed border-border bg-card/60 px-6 py-5 mb-6">
          <div className="flex items-center justify-center gap-2 text-foreground font-medium">
            <Computer size={18} />
            {t('download.windowsSoon', locale)}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('download.windowsSoonDesc', locale)}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-tertiary">
            {channelLabel} · {t('download.versionPrefix', locale)}
            {version}
          </p>
          <a
            href={releaseNotesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-foreground hover:text-brand transition-colors"
          >
            <ExternalLink size={16} />
            {t('download.releaseNotes', locale)}
          </a>
        </div>
      </div>
    </section>
  );
}
