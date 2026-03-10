import { moryflowPublicDownloads, allReleasesUrl } from '../../../shared/public-download';

interface DownloadButtonsProps {
  locale?: 'zh' | 'en';
}

const WWW_DOWNLOAD_URL = 'https://www.moryflow.com';

const texts = {
  zh: {
    sectionTitle: '当前公开下载',
    button: '前往下载页',
    appleSilicon: 'macOS（Apple Silicon）',
    appleSiliconDesc: '适用于 M1、M2、M3、M4 及更新的 Apple Silicon Mac',
    intelMac: 'macOS（Intel）',
    intelMacDesc: '适用于受支持 macOS 版本的 Intel Mac',
    version: '最新版本',
    allReleases: '查看所有版本',
    updateSource: '应用内自动更新使用 download.moryflow.com；网页手动下载使用 GitHub Releases。',
  },
  en: {
    sectionTitle: 'Current public download',
    button: 'Go to download page',
    appleSilicon: 'macOS (Apple Silicon)',
    appleSiliconDesc: 'M1, M2, M3, M4, and newer Apple Silicon Macs',
    intelMac: 'macOS (Intel)',
    intelMacDesc: 'Intel-based Macs running a supported version of macOS',
    version: 'Latest release',
    allReleases: 'View all releases',
    updateSource:
      'In-app automatic updates use download.moryflow.com; manual downloads use GitHub Releases.',
  },
} as const;

export function DownloadButtons({ locale = 'en' }: DownloadButtonsProps) {
  const t = texts[locale];
  const downloadPath = locale === 'zh' ? '/zh/download' : '/download';
  const downloadUrl = `${WWW_DOWNLOAD_URL}${downloadPath}`;

  const localizedDownloads = moryflowPublicDownloads.map((download) => ({
    ...download,
    shortLabel: download.id === 'darwin-arm64' ? t.appleSilicon : t.intelMac,
    description: download.id === 'darwin-arm64' ? t.appleSiliconDesc : t.intelMacDesc,
  }));

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
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-fd-primary text-fd-primary-foreground hover:opacity-90 transition-opacity"
            >
              {t.button}
            </a>
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
