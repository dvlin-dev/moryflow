/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Download section with Mac/Windows download cards (Lucide icons direct render)
 */

'use client';

import { useState } from 'react';
import { Download, Apple, Computer, Sparkles, CircleCheck, ExternalLink } from 'lucide-react';
import { useDownload } from '../../hooks/useDownload';
import { type MoryflowPublicDownloadPlatform } from '../../../../shared/public-download';

type DownloadState = 'idle' | 'preparing' | 'downloading';

export function DownloadCTA() {
  const { version, channelLabel, downloads, getDownloadInfo, startDownload, releaseNotesUrl } =
    useDownload();
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
    <section
      id="download"
      className="py-16 sm:py-32 px-4 sm:px-6 bg-gradient-to-b from-white to-orange-50/30 relative overflow-hidden scroll-mt-20"
    >
      {/* Decorative blurs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-300/15 rounded-full blur-3xl" />

      <div className="container mx-auto text-center max-w-6xl relative z-10">
        {/* Title */}
        <div className="mb-16">
          <h2 className="font-serif text-4xl md:text-6xl font-bold text-mory-text-primary mb-6">
            Ready to meet Mory?
          </h2>
          <p className="text-lg md:text-xl text-mory-text-secondary max-w-2xl mx-auto">
            The current public build ships as beta for macOS.
            <br />
            <span className="font-medium text-mory-text-primary">
              Pick the right build for Apple Silicon or Intel and start using Mory today.
            </span>
          </p>
        </div>

        {/* Download Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-10">
          {downloads.map((download) => (
            <div key={download.id} className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-purple-400/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative bg-gradient-to-br from-white/96 to-white/92 backdrop-blur-lg rounded-3xl p-10 border border-white/85 hover:border-white/90 transition-all hover:-translate-y-2 shadow-[0_4px_24px_0_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] shadow-gray-200/50 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-50/80 transition-colors border border-white/80 shadow-sm shadow-gray-200/30">
                  <Apple size={40} className="text-mory-text-primary" />
                </div>
                <h3 className="text-3xl font-serif font-bold text-mory-text-primary mb-3">
                  {download.shortLabel}
                </h3>
                <p className="text-sm text-mory-text-tertiary mb-8">{download.description}</p>
                <button
                  onClick={() => handleDownload(download.id)}
                  disabled={isButtonDisabled(download.id)}
                  className="w-full flex items-center justify-center gap-2 bg-mory-text-primary text-white px-6 py-4 rounded-2xl font-medium text-lg hover:bg-black transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {renderButtonContent(download.id, download.label)}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto mb-10">
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-orange-400/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-10 border-2 border-white/50 hover:border-white/70 transition-all hover:-translate-y-2 shadow-xl hover:shadow-2xl flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-50/80 transition-colors border border-white/40">
                <Computer size={40} className="text-mory-text-primary" />
              </div>
              <h3 className="text-3xl font-serif font-bold text-mory-text-primary mb-8">Windows</h3>
              <div className="w-full flex items-center justify-center gap-2 bg-gray-100 text-mory-text-secondary px-6 py-4 rounded-2xl font-medium text-lg">
                Available soon
              </div>
              <p className="mt-3 text-xs text-mory-text-tertiary">
                Windows support is temporarily offline
              </p>
            </div>
          </div>
        </div>

        {/* Version info */}
        <div className="space-y-3">
          <div className="text-sm text-mory-text-tertiary">
            {channelLabel} · v{version}
          </div>
          <a
            href={releaseNotesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-mory-text-primary hover:text-mory-orange transition-colors"
          >
            <ExternalLink size={16} />
            View release notes on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
