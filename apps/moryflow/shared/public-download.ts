/**
 * [DEFINES]: MoryFlow 公开下载平台定义
 * [USED_BY]: moryflow www, moryflow docs
 * [POS]: 公开下载面统一事实源（版本号由 /api/v1/latest-release 动态获取）
 */

export type MoryflowPublicDownloadPlatform = 'darwin-arm64' | 'darwin-x64';

export interface MoryflowPublicDownloadOption {
  id: MoryflowPublicDownloadPlatform;
  label: string;
  shortLabel: string;
  description: string;
  os: 'macOS';
  arch: 'arm64' | 'x64';
}

const GITHUB_RELEASES_BASE_URL = 'https://github.com/dvlin-dev/moryflow/releases';

export const allReleasesUrl = GITHUB_RELEASES_BASE_URL;

export const moryflowPublicDownloads: readonly MoryflowPublicDownloadOption[] = [
  {
    id: 'darwin-arm64',
    label: 'Download for macOS (Apple Silicon)',
    shortLabel: 'Apple Silicon',
    description: 'M1, M2, M3, M4, and newer Apple Silicon Macs',
    os: 'macOS',
    arch: 'arm64',
  },
  {
    id: 'darwin-x64',
    label: 'Download for macOS (Intel)',
    shortLabel: 'Intel Mac',
    description: 'Intel-based Macs running a supported version of macOS',
    os: 'macOS',
    arch: 'x64',
  },
] as const;

export function getMoryflowPublicDownloadOption(
  platform: MoryflowPublicDownloadPlatform
): MoryflowPublicDownloadOption | null {
  return moryflowPublicDownloads.find((item) => item.id === platform) ?? null;
}
