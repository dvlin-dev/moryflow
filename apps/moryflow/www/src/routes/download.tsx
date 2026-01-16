/**
 * [PROPS]: 无
 * [EMITS]: 无
 * [POS]: 下载页面
 */

'use client';

import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { generateMeta, siteConfig } from '@/lib/seo';
import { Icon } from '@anyhunt/ui';
import {
  Download01Icon,
  AppleIcon,
  ComputerIcon,
  Loading01Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import { useDownload } from '@/hooks/useDownload';

export const Route = createFileRoute('/download')({
  head: () => ({
    meta: generateMeta({
      title: 'Download',
      description: 'Download Moryflow for macOS or Windows. Free, local-first, privacy-focused.',
      path: '/download',
    }),
    links: [{ rel: 'canonical', href: `${siteConfig.url}/download` }],
  }),
  component: DownloadPage,
});

type Platform = 'mac' | 'win';
type DownloadState = 'idle' | 'preparing' | 'downloading';

function DownloadPage() {
  const { version, isLoading, getDownloadInfo, startDownload } = useDownload();
  const [downloadStates, setDownloadStates] = useState<Record<Platform, DownloadState>>({
    mac: 'idle',
    win: 'idle',
  });

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
          <Icon icon={Loading01Icon} size={20} className="animate-spin" />
          Loading...
        </>
      );
    }
    switch (state) {
      case 'preparing':
        return (
          <>
            <Icon icon={Loading01Icon} size={20} className="animate-spin" />
            Preparing...
          </>
        );
      case 'downloading':
        return (
          <>
            <Icon icon={CheckmarkCircle01Icon} size={20} className="text-green-400" />
            Download started
          </>
        );
      default:
        return (
          <>
            <Icon icon={Download01Icon} size={20} />
            {label}
          </>
        );
    }
  };

  const isButtonDisabled = (platform: Platform) => {
    return isLoading || downloadStates[platform] !== 'idle' || !getDownloadInfo(platform);
  };

  return (
    <main className="pt-24 pb-20">
      {/* Hero */}
      <section className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-mory-text-primary mb-6">
            Download Moryflow
          </h1>
          <p className="text-lg sm:text-xl text-mory-text-secondary max-w-2xl mx-auto">
            Free, local-first, privacy-focused. Your AI companion is just a download away.
          </p>
        </div>
      </section>

      {/* Download Cards */}
      <section className="px-4 sm:px-6 py-8">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* macOS */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-purple-400/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-white rounded-3xl p-10 border border-gray-100 hover:border-mory-orange/30 transition-all hover:-translate-y-2 shadow-sm hover:shadow-lg flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-50 transition-colors">
                  <Icon icon={AppleIcon} size={40} className="text-mory-text-primary" />
                </div>
                <h3 className="text-3xl font-serif font-bold text-mory-text-primary mb-2">macOS</h3>
                <p className="text-sm text-mory-text-tertiary mb-8">Apple Silicon (M1/M2/M3/M4)</p>
                <button
                  onClick={() => handleDownload('mac')}
                  disabled={isButtonDisabled('mac')}
                  className="w-full flex items-center justify-center gap-2 bg-mory-text-primary text-white px-6 py-4 rounded-xl font-medium text-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {renderButtonContent('mac', 'Download for Mac')}
                </button>
              </div>
            </div>

            {/* Windows */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-orange-400/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-white rounded-3xl p-10 border border-gray-100 hover:border-mory-orange/30 transition-all hover:-translate-y-2 shadow-sm hover:shadow-lg flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-50 transition-colors">
                  <Icon icon={ComputerIcon} size={40} className="text-mory-text-primary" />
                </div>
                <h3 className="text-3xl font-serif font-bold text-mory-text-primary mb-2">
                  Windows
                </h3>
                <p className="text-sm text-mory-text-tertiary mb-8">Windows 10/11 (64-bit)</p>
                <button
                  onClick={() => handleDownload('win')}
                  disabled={isButtonDisabled('win')}
                  className="w-full flex items-center justify-center gap-2 bg-mory-text-primary text-white px-6 py-4 rounded-xl font-medium text-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {renderButtonContent('win', 'Download for Windows')}
                </button>
              </div>
            </div>
          </div>

          {/* Version info */}
          <div className="text-center mt-8">
            <p className="text-sm text-mory-text-tertiary">
              {version ? `Version ${version}` : 'Beta'} · Free forever
            </p>
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
                <Icon icon={AppleIcon} size={20} /> macOS
              </h3>
              <ul className="space-y-2 text-sm text-mory-text-secondary">
                <li>macOS 12.0 (Monterey) or later</li>
                <li>Apple Silicon (M1/M2/M3/M4)</li>
                <li>4GB RAM minimum</li>
                <li>500MB disk space</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-mory-text-primary mb-4 flex items-center gap-2">
                <Icon icon={ComputerIcon} size={20} /> Windows
              </h3>
              <ul className="space-y-2 text-sm text-mory-text-secondary">
                <li>Windows 10/11 (64-bit)</li>
                <li>Intel or AMD processor</li>
                <li>4GB RAM minimum</li>
                <li>500MB disk space</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
