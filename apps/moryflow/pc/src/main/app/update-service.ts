/**
 * [PROVIDES]: 主进程更新检查/下载/状态广播服务
 * [DEPENDS]: electron-updater, runtime settings getters/setters
 * [POS]: 桌面端应用更新服务（事件驱动 + deferred promise）
 */

import { createRequire } from 'node:module';
import type {
  AppUpdateProgress,
  AppUpdateSettings,
  AppUpdateState,
} from '../../shared/ipc/app-update.js';

const require = createRequire(import.meta.url);

type TimerLike = {
  ref?: () => TimerLike;
  unref?: () => TimerLike;
};

export interface UpdaterLike {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  on: (event: string, listener: (payload?: unknown) => void) => UpdaterLike;
  removeListener: (event: string, listener: (payload?: unknown) => void) => UpdaterLike;
  checkForUpdates: () => Promise<unknown>;
  downloadUpdate: () => Promise<unknown>;
  quitAndInstall: (isSilent?: boolean, isForceRunAfter?: boolean) => void;
}

export type UpdateService = {
  getState: () => AppUpdateState;
  getSettings: () => AppUpdateSettings;
  setAutoDownload: (enabled: boolean) => AppUpdateSettings;
  checkForUpdates: (options?: { interactive?: boolean }) => Promise<AppUpdateState>;
  downloadUpdate: () => Promise<AppUpdateState>;
  restartToInstall: () => void;
  skipVersion: (version?: string | null) => AppUpdateSettings;
  scheduleAutomaticChecks: (initialDelayMs?: number, intervalMs?: number) => void;
  stopAutomaticChecks: () => void;
  subscribe: (listener: (state: AppUpdateState, settings: AppUpdateSettings) => void) => () => void;
  dispose: () => void;
};

type CreateUpdateServiceOptions = {
  currentVersion: string;
  platform?: NodeJS.Platform;
  isPackaged?: boolean;
  getAutoDownloadEnabled: () => boolean;
  setAutoDownloadEnabled: (enabled: boolean) => void;
  getSkippedVersion: () => string | null;
  setSkippedVersion: (version: string | null) => void;
  getLastCheckAt: () => string | null;
  setLastCheckAt: (value: string | null) => void;
  updater?: UpdaterLike;
  forceRestart?: () => void;
  scheduleTimeout?: (callback: () => void, delayMs: number) => TimerLike;
  clearScheduledTimeout?: (timer: TimerLike | null) => void;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const GITHUB_REPO = 'dvlin-dev/moryflow';
const STARTUP_CHECK_DELAY_MS = 20 * 1000;
const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
};

const normalizeMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return 'Update operation failed.';
};

const resolveVersion = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = (payload as { version?: unknown }).version;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
};

const toProgress = (payload: unknown): AppUpdateProgress | null => {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as Partial<AppUpdateProgress>;
  if (
    typeof candidate.percent !== 'number' ||
    typeof candidate.transferred !== 'number' ||
    typeof candidate.total !== 'number' ||
    typeof candidate.bytesPerSecond !== 'number'
  ) {
    return null;
  }
  return {
    percent: candidate.percent,
    transferred: candidate.transferred,
    total: candidate.total,
    bytesPerSecond: candidate.bytesPerSecond,
  };
};

const buildReleaseNotesUrl = (version: string): string =>
  `https://github.com/${GITHUB_REPO}/releases/tag/v${version}`;

export const resolveAutoUpdater = (
  loadModule: (moduleId: string) => unknown = require
): UpdaterLike => {
  const candidate = loadModule('electron-updater') as { autoUpdater?: UpdaterLike } | undefined;
  if (!candidate?.autoUpdater) {
    throw new Error('electron-updater.autoUpdater is unavailable.');
  }
  return candidate.autoUpdater;
};

export const createUpdateService = ({
  currentVersion,
  platform = process.platform,
  isPackaged = false,
  getAutoDownloadEnabled,
  setAutoDownloadEnabled,
  getSkippedVersion,
  setSkippedVersion,
  getLastCheckAt,
  setLastCheckAt,
  updater = resolveAutoUpdater(),
  forceRestart,
  scheduleTimeout = (callback, delayMs) => {
    const timer = setTimeout(callback, delayMs) as unknown as TimerLike;
    timer.unref?.();
    return timer;
  },
  clearScheduledTimeout = (timer) => {
    if (timer) clearTimeout(timer as unknown as NodeJS.Timeout);
  },
}: CreateUpdateServiceOptions): UpdateService => {
  const supported = platform === 'darwin' && isPackaged;
  const listeners = new Set<(state: AppUpdateState, settings: AppUpdateSettings) => void>();
  const scheduledTimers = new Set<TimerLike>();

  let checkDeferred: Deferred<AppUpdateState> | null = null;
  let downloadDeferred: Deferred<AppUpdateState> | null = null;
  let pendingInteractive = false;

  let state: AppUpdateState = {
    status: 'idle',
    currentVersion,
    availableVersion: null,
    downloadedVersion: null,
    releaseNotesUrl: null,
    errorMessage: supported ? null : 'Automatic updates are only supported on packaged macOS builds.',
    downloadProgress: null,
    lastCheckedAt: getLastCheckAt(),
  };

  const getSettings = (): AppUpdateSettings => ({
    autoDownload: getAutoDownloadEnabled(),
    skippedVersion: getSkippedVersion(),
    lastCheckAt: getLastCheckAt(),
  });

  const emit = () => {
    const settings = getSettings();
    for (const listener of listeners) {
      listener(state, settings);
    }
  };

  const setState = (patch: Partial<AppUpdateState>): AppUpdateState => {
    state = { ...state, ...patch };
    emit();
    return { ...state };
  };

  const resolveCheck = (nextState: AppUpdateState) => {
    checkDeferred?.resolve(nextState);
    checkDeferred = null;
    pendingInteractive = false;
  };

  const resolveDownload = (nextState: AppUpdateState) => {
    downloadDeferred?.resolve(nextState);
    downloadDeferred = null;
  };

  // --- electron-updater event handlers ---

  const handleAvailable = (payload?: unknown) => {
    const version = resolveVersion(payload);
    const checkedAt = new Date().toISOString();
    setLastCheckAt(checkedAt);

    // Already downloaded — preserve downloaded state, don't re-download
    if (version && state.downloadedVersion === version) {
      const nextState = setState({
        status: 'downloaded',
        lastCheckedAt: checkedAt,
        errorMessage: null,
      });
      resolveCheck(nextState);
      return;
    }

    // Skip check (only for silent/automatic checks)
    if (!pendingInteractive && version && getSkippedVersion() === version) {
      const nextState = setState({
        status: 'idle',
        availableVersion: null,
        lastCheckedAt: checkedAt,
        errorMessage: null,
      });
      resolveCheck(nextState);
      return;
    }

    const nextState = setState({
      status: 'available',
      availableVersion: version,
      releaseNotesUrl: version ? buildReleaseNotesUrl(version) : null,
      downloadProgress: null,
      errorMessage: null,
      lastCheckedAt: checkedAt,
    });
    resolveCheck(nextState);

    // Auto-download if enabled
    if (getAutoDownloadEnabled() && version) {
      void startDownload();
    }
  };

  const handleNotAvailable = () => {
    const checkedAt = new Date().toISOString();
    setLastCheckAt(checkedAt);
    const nextState = setState({
      status: 'idle',
      availableVersion: null,
      downloadProgress: null,
      errorMessage: null,
      lastCheckedAt: checkedAt,
    });
    resolveCheck(nextState);
  };

  const handleDownloadProgress = (payload?: unknown) => {
    const progress = toProgress(payload);
    if (!progress) return;
    setState({
      status: 'downloading',
      downloadProgress: progress,
      errorMessage: null,
    });
  };

  const handleDownloaded = (payload?: unknown) => {
    const version = resolveVersion(payload) ?? state.availableVersion;
    updater.autoInstallOnAppQuit = true;
    const nextState = setState({
      status: 'downloaded',
      availableVersion: null,
      downloadedVersion: version,
      downloadProgress: null,
      errorMessage: null,
    });
    resolveDownload(nextState);
  };

  let restartSafetyNetTimer: TimerLike | null = null;

  const cancelRestartSafetyNet = () => {
    if (restartSafetyNetTimer) {
      clearScheduledTimeout(restartSafetyNetTimer);
      restartSafetyNetTimer = null;
    }
  };

  const handleError = (payload?: unknown) => {
    cancelRestartSafetyNet();
    const nextState = setState({
      status: 'error',
      downloadProgress: null,
      errorMessage: normalizeMessage(payload),
      lastCheckedAt: state.lastCheckedAt ?? new Date().toISOString(),
    });
    resolveCheck(nextState);
    resolveDownload(nextState);
  };

  if (supported) {
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.on('update-available', handleAvailable);
    updater.on('update-not-available', handleNotAvailable);
    updater.on('download-progress', handleDownloadProgress);
    updater.on('update-downloaded', handleDownloaded);
    updater.on('error', handleError);
  }

  // --- public methods ---

  const checkForUpdates = async ({
    interactive = false,
  }: { interactive?: boolean } = {}): Promise<AppUpdateState> => {
    if (!supported) return state;
    if (state.status === 'restarting') return state;

    if (checkDeferred) {
      if (interactive && !pendingInteractive) {
        pendingInteractive = true;
      }
      return checkDeferred.promise;
    }

    const deferred = createDeferred<AppUpdateState>();
    checkDeferred = deferred;
    pendingInteractive = interactive;

    setState({
      status: 'checking',
      errorMessage: null,
      downloadProgress: null,
    });

    try {
      await updater.checkForUpdates();
    } catch (error) {
      const nextState = setState({
        status: 'error',
        errorMessage: normalizeMessage(error),
        downloadProgress: null,
        lastCheckedAt: new Date().toISOString(),
      });
      resolveCheck(nextState);
    }

    return deferred.promise;
  };

  const startDownload = async (): Promise<AppUpdateState> => {
    if (!supported) return state;
    if (state.status === 'restarting') return state;

    if (downloadDeferred) return downloadDeferred.promise;

    if (state.status === 'downloaded') return state;

    const deferred = createDeferred<AppUpdateState>();
    downloadDeferred = deferred;

    setState({
      status: 'downloading',
      downloadProgress: null,
      errorMessage: null,
    });

    try {
      await updater.downloadUpdate();
    } catch (error) {
      const nextState = setState({
        status: 'error',
        errorMessage: normalizeMessage(error),
        downloadProgress: null,
      });
      resolveDownload(nextState);
    }

    return deferred.promise;
  };

  const restartToInstall = () => {
    const canRestart =
      state.status === 'downloaded' ||
      (state.status === 'error' && state.downloadedVersion !== null && !state.availableVersion);
    if (!canRestart) {
      throw new Error('No downloaded release is available to install.');
    }

    setState({ status: 'restarting' });
    updater.autoInstallOnAppQuit = true;

    try {
      updater.quitAndInstall(false, true);
    } catch (error) {
      // quitAndInstall threw — don't force restart (app.exit skips will-quit,
      // so autoInstallOnAppQuit handler won't run and the old version restarts).
      // Fall back to error state; the update will be applied on next normal quit.
      setState({
        status: 'error',
        errorMessage: normalizeMessage(error),
      });
      return;
    }

    // Safety net: if quitAndInstall didn't throw but the process is still alive
    // after 5s, force restart. quitAndInstall already ran install() internally,
    // so the update should be prepared — forceRestart gives it one more chance.
    if (forceRestart) {
      cancelRestartSafetyNet();
      // Stored outside scheduledTimers so dispose() (called from before-quit)
      // does not cancel it — the safety net must survive the quit teardown.
      restartSafetyNetTimer = scheduleTimeout(() => forceRestart(), 5000);
    }
  };

  const setAutoDownload = (enabled: boolean): AppUpdateSettings => {
    setAutoDownloadEnabled(enabled);
    updater.autoDownload = false; // always false — we handle download ourselves
    return getSettings();
  };

  const skipVersion = (version?: string | null): AppUpdateSettings => {
    const nextVersion = version ?? state.availableVersion ?? state.downloadedVersion ?? null;
    setSkippedVersion(nextVersion);
    if (nextVersion && state.availableVersion === nextVersion && state.status === 'available') {
      setState({ status: 'idle', availableVersion: null });
    }
    if (nextVersion && state.downloadedVersion === nextVersion && (state.status === 'downloaded' || state.status === 'error')) {
      setState({ status: 'idle', downloadedVersion: null, errorMessage: null });
    }
    return getSettings();
  };

  const scheduleAutomaticChecks = (
    initialDelayMs = STARTUP_CHECK_DELAY_MS,
    intervalMs = UPDATE_INTERVAL_MS
  ) => {
    stopAutomaticChecks();

    let currentHandle: TimerLike | null = null;
    const run = () => {
      if (currentHandle) scheduledTimers.delete(currentHandle);
      void checkForUpdates({ interactive: false });
      currentHandle = scheduleTimeout(run, intervalMs);
      scheduledTimers.add(currentHandle);
    };

    currentHandle = scheduleTimeout(run, initialDelayMs);
    scheduledTimers.add(currentHandle);
  };

  const stopAutomaticChecks = () => {
    for (const handle of scheduledTimers) {
      clearScheduledTimeout(handle);
    }
    scheduledTimers.clear();
  };

  const subscribe = (
    listener: (nextState: AppUpdateState, settings: AppUpdateSettings) => void
  ) => {
    listeners.add(listener);
    listener(state, getSettings());
    return () => {
      listeners.delete(listener);
    };
  };

  const dispose = () => {
    stopAutomaticChecks();
    if (supported) {
      updater.removeListener('update-available', handleAvailable);
      updater.removeListener('update-not-available', handleNotAvailable);
      updater.removeListener('download-progress', handleDownloadProgress);
      updater.removeListener('update-downloaded', handleDownloaded);
      updater.removeListener('error', handleError);
    }
    listeners.clear();
  };

  return {
    getState: () => ({ ...state }),
    getSettings,
    setAutoDownload,
    checkForUpdates,
    downloadUpdate: startDownload,
    restartToInstall,
    skipVersion,
    scheduleAutomaticChecks,
    stopAutomaticChecks,
    subscribe,
    dispose,
  };
};
