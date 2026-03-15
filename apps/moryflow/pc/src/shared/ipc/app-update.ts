/**
 * [DEFINES]: app update IPC 类型（settings/state/action contract）
 * [USED_BY]: main update service, preload bridge, renderer update UI
 * [POS]: app update 合同单一事实源
 */

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export type AppUpdateProgress = {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
};

export type AppUpdateSettings = {
  autoDownload: boolean;
  skippedVersion: string | null;
  lastCheckAt: string | null;
};

export type AppUpdateState = {
  status: UpdateStatus;
  currentVersion: string;
  availableVersion: string | null;
  downloadedVersion: string | null;
  releaseNotesUrl: string | null;
  errorMessage: string | null;
  downloadProgress: AppUpdateProgress | null;
  lastCheckedAt: string | null;
};

export type AppUpdateStateChangeEvent = {
  state: AppUpdateState;
  settings: AppUpdateSettings;
};
