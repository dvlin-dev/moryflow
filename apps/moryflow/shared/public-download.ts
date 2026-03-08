/**
 * [DEFINES]: MoryFlow 对外下载与 release 口径
 * [USED_BY]: moryflow www, moryflow docs
 * [POS]: 公开下载面统一事实源
 *
 * [PROTOCOL]: 当公开版本、公开 channel 或公开平台变化时，
 * 必须同步更新本文件与 docs/design/moryflow/runbooks/pc-release-and-auto-update.md
 */

export type MoryflowPublicChannel = 'stable' | 'beta';
export type MoryflowPublicDownloadPlatform = 'darwin-arm64' | 'darwin-x64';

export interface MoryflowPublicDownloadOption {
  id: MoryflowPublicDownloadPlatform;
  label: string;
  shortLabel: string;
  description: string;
  os: 'macOS';
  arch: 'arm64' | 'x64';
  manualDownloadUrl: string;
  mirroredDownloadUrl: string;
  filename: string;
}

const GITHUB_RELEASES_BASE_URL = 'https://github.com/dvlin-dev/moryflow/releases';
const PUBLIC_DOWNLOAD_PAGE_URL = 'https://moryflow.com/download';

const publicChannel: MoryflowPublicChannel = 'beta';
const publicVersion = '0.2.17-beta.1';
const publicTag = `v${publicVersion}`;
const githubAssetBaseUrl = `${GITHUB_RELEASES_BASE_URL}/download/${publicTag}`;
const mirroredAssetBaseUrl = `https://download.moryflow.com/releases/${publicTag}/darwin`;

export const moryflowPublicRelease = {
  channel: publicChannel,
  channelLabel: 'Beta',
  version: publicVersion,
  tag: publicTag,
  isPrerelease: true,
  title: `MoryFlow ${publicVersion}`,
  downloadPageUrl: PUBLIC_DOWNLOAD_PAGE_URL,
  releaseUrl: `${GITHUB_RELEASES_BASE_URL}/tag/${publicTag}`,
  releaseNotesUrl: `${GITHUB_RELEASES_BASE_URL}/tag/${publicTag}`,
  allReleasesUrl: GITHUB_RELEASES_BASE_URL,
  automaticUpdatesBaseUrl: `https://download.moryflow.com/channels/${publicChannel}`,
  supportSummary: 'Public downloads currently ship as beta on macOS.',
  supportedPlatformsSummary: 'macOS (Apple Silicon) and macOS (Intel)',
  comingSoonPlatforms: ['Windows'] as const,
} as const;

export const moryflowPublicDownloads: readonly MoryflowPublicDownloadOption[] = [
  {
    id: 'darwin-arm64',
    label: 'Download for macOS (Apple Silicon)',
    shortLabel: 'Apple Silicon',
    description: 'M1, M2, M3, M4, and newer Apple Silicon Macs',
    os: 'macOS',
    arch: 'arm64',
    manualDownloadUrl: `${githubAssetBaseUrl}/MoryFlow-${publicVersion}-arm64.dmg`,
    mirroredDownloadUrl: `${mirroredAssetBaseUrl}/arm64/MoryFlow-${publicVersion}-arm64.dmg`,
    filename: `MoryFlow-${publicVersion}-arm64.dmg`,
  },
  {
    id: 'darwin-x64',
    label: 'Download for macOS (Intel)',
    shortLabel: 'Intel Mac',
    description: 'Intel-based Macs running a supported version of macOS',
    os: 'macOS',
    arch: 'x64',
    manualDownloadUrl: `${githubAssetBaseUrl}/MoryFlow-${publicVersion}-x64.dmg`,
    mirroredDownloadUrl: `${mirroredAssetBaseUrl}/x64/MoryFlow-${publicVersion}-x64.dmg`,
    filename: `MoryFlow-${publicVersion}-x64.dmg`,
  },
] as const;

export const moryflowPublicSystemRequirements = {
  macos: ['macOS 12.0 or later', 'Apple Silicon or Intel', '4GB RAM minimum', '500MB disk space'],
  windows: ['Coming soon'],
} as const;

export function getMoryflowPublicDownloadOption(
  platform: MoryflowPublicDownloadPlatform
): MoryflowPublicDownloadOption | null {
  return moryflowPublicDownloads.find((item) => item.id === platform) ?? null;
}
