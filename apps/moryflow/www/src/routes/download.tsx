/**
 * [PROPS]: 无
 * [EMITS]: 无
 * [POS]: 下载页面（Lucide icons direct render）
 */

'use client';

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { generateMeta, siteConfig } from '@/lib/seo';
import { Download, Apple, Computer, CircleCheck, ExternalLink, Sparkles } from 'lucide-react';
import { useDownload } from '@/hooks/useDownload';
import {
  moryflowPublicSystemRequirements,
  type MoryflowPublicDownloadPlatform,
} from '../../../shared/public-download';

export const Route = createFileRoute('/download')({
  head: () => ({
    meta: generateMeta({
      title: 'Download',
      description:
        'Download the current Moryflow beta for macOS on Apple Silicon or Intel. View release notes and release history from GitHub Releases.',
      path: '/download',
    }),
    links: [{ rel: 'canonical', href: `${siteConfig.url}/download` }],
  }),
  component: DownloadPage,
});

type DownloadState = 'idle' | 'preparing' | 'downloading';

function DownloadPage() {
  const {
    version,
    channelLabel,
    downloads,
    getDownloadInfo,
    startDownload,
    releaseNotesUrl,
    allReleasesUrl,
  } = useDownload();
  const [downloadStates, setDownloadStates] = useState<
    Record<MoryflowPublicDownloadPlatform, DownloadState>
  >({
    'darwin-arm64': 'idle',
    'darwin-x64': 'idle',
  });

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
            Preparing...
          </>
        );
      case 'downloading':
        return (
          <>
            <CircleCheck size={20} className="text-green-400" />
            Download started
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
    <main className="pt-24 pb-20">
      {/* Hero */}
      <section className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-mory-text-primary mb-6">
            Download Moryflow
          </h1>
          <p className="text-lg sm:text-xl text-mory-text-secondary max-w-3xl mx-auto">
            The current public build ships as beta on macOS. Choose the right build for your Mac,
            and use GitHub Releases for release notes and manual fallback downloads.
          </p>
        </div>
      </section>

      {/* Download Cards */}
      <section className="px-4 sm:px-6 py-8">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {downloads.map((download) => (
              <div key={download.id} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-purple-400/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-white rounded-3xl p-10 border border-gray-100 hover:border-mory-orange/30 transition-all hover:-translate-y-2 shadow-sm hover:shadow-lg flex flex-col items-center text-center h-full">
                  <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-50 transition-colors">
                    <Apple size={40} className="text-mory-text-primary" />
                  </div>
                  <h3 className="text-3xl font-serif font-bold text-mory-text-primary mb-2">
                    {download.shortLabel}
                  </h3>
                  <p className="text-sm text-mory-text-tertiary mb-8">{download.description}</p>
                  <button
                    onClick={() => handleDownload(download.id)}
                    disabled={isButtonDisabled(download.id)}
                    className="w-full flex items-center justify-center gap-2 bg-mory-text-primary text-white px-6 py-4 rounded-xl font-medium text-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {renderButtonContent(download.id, download.label)}
                  </button>
                </div>
              </div>
            ))}

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-orange-400/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-white rounded-3xl p-10 border border-gray-100 hover:border-mory-orange/30 transition-all hover:-translate-y-2 shadow-sm hover:shadow-lg flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-50 transition-colors">
                  <Computer size={40} className="text-mory-text-primary" />
                </div>
                <h3 className="text-3xl font-serif font-bold text-mory-text-primary mb-2">
                  Windows
                </h3>
                <p className="text-sm text-mory-text-tertiary mb-8">Coming soon</p>
                <div className="w-full flex items-center justify-center gap-2 bg-gray-100 text-mory-text-secondary px-6 py-4 rounded-xl font-medium text-lg">
                  Available soon
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-10 space-y-3">
            <p className="text-sm text-mory-text-tertiary">
              {channelLabel} · v{version}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              <a
                href={releaseNotesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-mory-text-primary hover:text-mory-orange transition-colors"
              >
                <ExternalLink size={16} />
                View release notes
              </a>
              <a
                href={allReleasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-mory-text-primary hover:text-mory-orange transition-colors"
              >
                <ExternalLink size={16} />
                View all releases
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="px-4 sm:px-6 py-16">
        <div className="container mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl font-bold text-mory-text-primary text-center mb-8">
            System Requirements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-mory-text-primary mb-4 flex items-center gap-2">
                <Apple size={20} /> macOS
              </h3>
              <ul className="space-y-2 text-sm text-mory-text-secondary">
                {moryflowPublicSystemRequirements.macos.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-mory-text-primary mb-4 flex items-center gap-2">
                <Computer size={20} /> Windows
              </h3>
              <ul className="space-y-2 text-sm text-mory-text-secondary">
                {moryflowPublicSystemRequirements.windows.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-mory-orange/20 bg-orange-50/60 px-6 py-5 text-sm text-mory-text-secondary">
            MoryFlow uses GitHub Releases as the official manual download and release-notes page.
            The `download.moryflow.com` domain is reserved for in-app update delivery.
          </div>
        </div>
      </section>
    </main>
  );
}
