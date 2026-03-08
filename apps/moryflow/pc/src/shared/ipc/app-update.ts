/**
 * [DEFINES]: app update IPC 类型（channel/settings/state/action contract）
 * [USED_BY]: main update service, preload bridge, renderer update UI
 * [POS]: app update 合同单一事实源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export type UpdateChannel = 'stable' | 'beta';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export type AppUpdateDownloadTarget = {
  feedUrl: string;
  directUrl: string;
};

export type AppUpdateManifest = {
  channel: UpdateChannel;
  version: string;
  publishedAt: string;
  notesUrl: string;
  notesSummary: string[];
  rolloutPercentage: number;
  minimumSupportedVersion: string | null;
  blockedVersions: string[];
  downloads: Record<string, AppUpdateDownloadTarget>;
};

export type AppUpdateProgress = {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
};

export type AppUpdateSettings = {
  channel: UpdateChannel;
  autoCheck: boolean;
  autoDownload: boolean;
  skippedVersion: string | null;
  lastCheckAt: string | null;
};

export type AppUpdateState = {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
  availableVersion: string | null;
  downloadedVersion: string | null;
  channel: UpdateChannel;
  releaseNotesUrl: string | null;
  downloadUrl: string | null;
  notesSummary: string[];
  errorMessage: string | null;
  downloadProgress: AppUpdateProgress | null;
  minimumSupportedVersion: string | null;
  blockedVersions: string[];
  requiresImmediateUpdate: boolean;
  currentVersionBlocked: boolean;
  lastCheckedAt: string | null;
};

export type AppUpdateStateChangeEvent = {
  state: AppUpdateState;
  settings: AppUpdateSettings;
};
