/**
 * [PROVIDES]: 主进程更新检查/下载/状态广播服务
 * [DEPENDS]: electron-updater, runtime settings getters/setters, manifest fetcher
 * [POS]: 桌面端应用更新服务
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { autoUpdater } from 'electron-updater';
import type {
  AppUpdateDownloadTarget,
  AppUpdateManifest,
  AppUpdateProgress,
  AppUpdateSettings,
  AppUpdateState,
  UpdateChannel,
} from '../../shared/ipc/app-update.js';

type SupportedPlatform = 'darwin' | 'win32';
type SupportedArch = 'arm64' | 'x64';

type TimerLike = {
  ref?: () => TimerLike;
  unref?: () => TimerLike;
};

type UpdaterLike = {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  on: (event: any, listener: (payload?: unknown) => void) => UpdaterLike;
  removeListener: (event: any, listener: (payload?: unknown) => void) => UpdaterLike;
  setFeedURL: (options: { provider: 'generic'; url: string }) => void;
  checkForUpdates?: () => Promise<unknown>;
  downloadUpdate: () => Promise<unknown>;
  quitAndInstall: () => void;
};

type CreateUpdateServiceOptions = {
  currentVersion: string;
  platform?: NodeJS.Platform;
  arch?: string;
  updateBaseUrl?: string;
  getStoredChannel: () => UpdateChannel;
  setStoredChannel: (channel: UpdateChannel) => void;
  getAutoCheckEnabled: () => boolean;
  setAutoCheckEnabled: (enabled: boolean) => void;
  getAutoDownloadEnabled: () => boolean;
  setAutoDownloadEnabled: (enabled: boolean) => void;
  getSkippedVersion: (channel: UpdateChannel) => string | null;
  setSkippedVersion: (channel: UpdateChannel, version: string | null) => void;
  getLastCheckAt: () => string | null;
  setLastCheckAt: (value: string | null) => void;
  getRolloutId?: () => string;
  fetchManifest?: (input: { baseUrl: string; channel: UpdateChannel }) => Promise<AppUpdateManifest>;
  updater?: UpdaterLike;
  scheduleTimeout?: (callback: () => void, delayMs: number) => TimerLike;
  clearScheduledTimeout?: (timer: TimerLike | null) => void;
};

type CheckOptions = {
  interactive?: boolean;
};

type AppUpdateService = {
  getState: () => AppUpdateState;
  getSettings: () => AppUpdateSettings;
  setChannel: (channel: UpdateChannel) => AppUpdateSettings;
  setAutoCheck: (enabled: boolean) => AppUpdateSettings;
  setAutoDownload: (enabled: boolean) => AppUpdateSettings;
  checkForUpdates: (options?: CheckOptions) => Promise<AppUpdateState>;
  downloadUpdate: () => Promise<AppUpdateState>;
  restartToInstall: () => void;
  skipVersion: (version?: string | null) => AppUpdateSettings;
  scheduleAutomaticChecks: (initialDelayMs?: number, intervalMs?: number) => void;
  stopAutomaticChecks: () => void;
  subscribe: (
    listener: (state: AppUpdateState, settings: AppUpdateSettings) => void
  ) => () => void;
  dispose: () => void;
};

type CheckContext = {
  requestId: number;
  channel: UpdateChannel;
  epoch: number;
  interactive: boolean;
};

type DownloadContext = {
  channel: UpdateChannel;
  version: string;
  epoch: number;
};

const DEFAULT_UPDATE_BASE_URL = 'https://download.moryflow.com';
const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STARTUP_CHECK_DELAY_MS = 45 * 1000;

const isSupportedPlatform = (platform: NodeJS.Platform): platform is SupportedPlatform =>
  platform === 'darwin' || platform === 'win32';

const normalizeArch = (arch: string): SupportedArch => (arch === 'arm64' ? 'arm64' : 'x64');

const createPlatformKey = (platform: SupportedPlatform, arch: SupportedArch): string =>
  `${platform}-${arch}`;

const getFeedBaseUrl = (feedUrl: string): string => new URL('./', feedUrl).toString();

const normalizeMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return 'Update operation failed.';
};

const parseVersion = (
  version: string
): { major: number; minor: number; patch: number; prerelease: string | null } | null => {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  };
};

const compareVersions = (left: string, right: string): number => {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) {
    return left.localeCompare(right);
  }

  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === null) return 1;
  if (b.prerelease === null) return -1;
  return a.prerelease.localeCompare(b.prerelease, undefined, { numeric: true });
};

const defaultFetchManifest = async ({
  baseUrl,
  channel,
}: {
  baseUrl: string;
  channel: UpdateChannel;
}): Promise<AppUpdateManifest> => {
  const response = await fetch(`${baseUrl}/channels/${channel}/manifest.json`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch update manifest: HTTP ${response.status}`);
  }
  const payload = (await response.json()) as AppUpdateManifest;
  return payload;
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

const hasBlockedCurrentVersion = (currentVersion: string, blockedVersions: string[]): boolean => {
  return blockedVersions.some((version) => compareVersions(version, currentVersion) === 0);
};

const hasMinimumVersionRequirement = (
  currentVersion: string,
  minimumSupportedVersion: string | null
): boolean => {
  if (!minimumSupportedVersion) {
    return false;
  }
  return compareVersions(currentVersion, minimumSupportedVersion) < 0;
};

const normalizeRolloutPercentage = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 100;
  }
  return Math.min(100, Math.max(0, Math.floor(value)));
};

const hashRolloutBucket = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
};

const isRolloutEligible = ({
  rolloutId,
  channel,
  version,
  rolloutPercentage,
}: {
  rolloutId: string;
  channel: UpdateChannel;
  version: string;
  rolloutPercentage: number;
}): boolean => {
  const percentage = normalizeRolloutPercentage(rolloutPercentage);
  if (percentage >= 100) {
    return true;
  }
  if (percentage <= 0) {
    return false;
  }
  return hashRolloutBucket(`${rolloutId}:${channel}:${version}`) < percentage;
};

export const createUpdateService = ({
  currentVersion,
  platform = process.platform,
  arch = process.arch,
  updateBaseUrl = process.env['MORYFLOW_UPDATE_BASE_URL']?.trim() || DEFAULT_UPDATE_BASE_URL,
  getStoredChannel,
  setStoredChannel,
  getAutoCheckEnabled,
  setAutoCheckEnabled,
  getAutoDownloadEnabled,
  setAutoDownloadEnabled,
  getSkippedVersion,
  setSkippedVersion,
  getLastCheckAt,
  setLastCheckAt,
  getRolloutId = () => 'default-rollout',
  fetchManifest = defaultFetchManifest,
  updater = autoUpdater,
  scheduleTimeout = (callback, delayMs) => {
    const timer = setTimeout(callback, delayMs) as unknown as TimerLike;
    timer.unref?.();
    return timer;
  },
  clearScheduledTimeout = (timer) => {
    if (timer) {
      clearTimeout(timer as unknown as NodeJS.Timeout);
    }
  },
}: CreateUpdateServiceOptions): AppUpdateService => {
  const currentChannel = (): UpdateChannel => getStoredChannel();
  const listeners = new Set<(state: AppUpdateState, settings: AppUpdateSettings) => void>();
  const scheduledTimers = new Set<TimerLike>();
  let latestManifest: AppUpdateManifest | null = null;
  let latestTarget: AppUpdateDownloadTarget | null = null;
  let primedTargetKey: string | null = null;
  let channelEpoch = 0;
  let nextCheckRequestId = 0;
  let activeCheckContext: CheckContext | null = null;
  let activeDownloadContext: DownloadContext | null = null;
  let checkPromise: Promise<AppUpdateState> | null = null;
  let downloadPromise: Promise<AppUpdateState> | null = null;
  let activeCheckPromiseToken: symbol | null = null;
  let activeDownloadPromiseToken: symbol | null = null;

  let state: AppUpdateState = {
    status: 'idle',
    currentVersion,
    latestVersion: null,
    availableVersion: null,
    downloadedVersion: null,
    channel: currentChannel(),
    releaseNotesUrl: null,
    downloadUrl: null,
    notesSummary: [],
    errorMessage: null,
    downloadProgress: null,
    minimumSupportedVersion: null,
    blockedVersions: [],
    requiresImmediateUpdate: false,
    currentVersionBlocked: false,
    lastCheckedAt: getLastCheckAt(),
  };

  const getSettings = (): AppUpdateSettings => ({
    channel: currentChannel(),
    autoCheck: getAutoCheckEnabled(),
    autoDownload: getAutoDownloadEnabled(),
    skippedVersion: getSkippedVersion(currentChannel()),
    lastCheckAt: getLastCheckAt(),
  });

  const emit = () => {
    const settings = getSettings();
    for (const listener of listeners) {
      listener(state, settings);
    }
  };

  const setState = (patch: Partial<AppUpdateState>) => {
    state = { ...state, ...patch };
    emit();
  };

  const resolveTarget = (manifest: AppUpdateManifest): AppUpdateDownloadTarget => {
    if (!isSupportedPlatform(platform)) {
      throw new Error(`Unsupported update platform: ${platform}`);
    }
    const platformKey = createPlatformKey(platform, normalizeArch(arch));
    const target = manifest.downloads[platformKey];
    if (!target) {
      throw new Error(`No update target configured for ${platformKey}`);
    }
    return target;
  };

  const isCheckContextCurrent = (context: CheckContext): boolean => {
    return (
      activeCheckContext?.requestId === context.requestId &&
      context.channel === currentChannel() &&
      context.epoch === channelEpoch
    );
  };

  const isDownloadContextCurrent = (context: DownloadContext): boolean => {
    return (
      activeDownloadContext?.channel === context.channel &&
      activeDownloadContext?.version === context.version &&
      context.channel === currentChannel() &&
      context.epoch === channelEpoch
    );
  };

  const resetResolvedArtifacts = () => {
    latestManifest = null;
    latestTarget = null;
    primedTargetKey = null;
  };

  const createTargetKey = (
    channel: UpdateChannel,
    version: string,
    target: AppUpdateDownloadTarget
  ): string => {
    return `${channel}:${version}:${target.feedUrl}:${target.directUrl}`;
  };

  const ensureUpdaterFeedPrimed = async ({
    channel,
    version,
    target,
  }: {
    channel: UpdateChannel;
    version: string;
    target: AppUpdateDownloadTarget;
  }) => {
    const nextTargetKey = createTargetKey(channel, version, target);
    if (primedTargetKey === nextTargetKey) {
      return;
    }
    updater.autoDownload = getAutoDownloadEnabled();
    updater.autoInstallOnAppQuit = false;
    updater.setFeedURL({
      provider: 'generic',
      url: getFeedBaseUrl(target.feedUrl),
    });
    if (typeof updater.checkForUpdates === 'function') {
      await updater.checkForUpdates();
    }
    primedTargetKey = nextTargetKey;
  };

  const handleDownloadProgress = (payload?: unknown) => {
    if (!activeDownloadContext || !isDownloadContextCurrent(activeDownloadContext)) {
      return;
    }
    const progress = toProgress(payload);
    if (!progress) return;
    setState({
      status: 'downloading',
      downloadProgress: progress,
      errorMessage: null,
    });
  };

  const handleDownloaded = () => {
    if (!activeDownloadContext || !isDownloadContextCurrent(activeDownloadContext)) {
      return;
    }
    setState({
      status: 'downloaded',
      availableVersion: null,
      downloadedVersion: activeDownloadContext.version,
      downloadProgress: null,
      errorMessage: null,
    });
  };

  const handleError = (payload?: unknown) => {
    const activeDownload = activeDownloadContext && isDownloadContextCurrent(activeDownloadContext);
    const activeCheck = activeCheckContext && isCheckContextCurrent(activeCheckContext);
    if (!activeDownload && !activeCheck) {
      return;
    }
    setState({
      status: 'error',
      errorMessage: normalizeMessage(payload),
    });
  };

  updater.on('download-progress', handleDownloadProgress);
  updater.on('update-downloaded', handleDownloaded);
  updater.on('error', handleError);

  const startDownload = async (context: DownloadContext): Promise<AppUpdateState> => {
    if (state.status === 'downloaded' && state.downloadedVersion === context.version) {
      return state;
    }
    if (downloadPromise) {
      return downloadPromise;
    }

    activeDownloadContext = context;
    setState({
      status: 'downloading',
      errorMessage: null,
    });

    const promiseToken = Symbol('download');
    const currentPromise = (async () => {
      try {
        await updater.downloadUpdate();
        if (isDownloadContextCurrent(context) && state.status !== 'downloaded') {
          setState({
            status: 'downloaded',
            availableVersion: null,
            downloadedVersion: context.version,
            downloadProgress: null,
            errorMessage: null,
          });
        }
        return state;
      } catch (error) {
        if (isDownloadContextCurrent(context)) {
          setState({
            status: 'error',
            errorMessage: normalizeMessage(error),
          });
        }
        return state;
      } finally {
        if (activeDownloadPromiseToken === promiseToken) {
          downloadPromise = null;
          activeDownloadPromiseToken = null;
        }
        if (isDownloadContextCurrent(context)) {
          activeDownloadContext = null;
        }
      }
    })();

    activeDownloadPromiseToken = promiseToken;
    downloadPromise = currentPromise;
    return currentPromise;
  };

  const checkForUpdates = async ({
    interactive = false,
  }: CheckOptions = {}): Promise<AppUpdateState> => {
    if (checkPromise && (!interactive || activeCheckContext?.interactive)) {
      return checkPromise;
    }

    const channel = currentChannel();
    const context: CheckContext = {
      requestId: ++nextCheckRequestId,
      channel,
      epoch: channelEpoch,
      interactive,
    };
    activeCheckContext = context;

    setState({
      status: 'checking',
      channel,
      errorMessage: null,
      downloadProgress: null,
    });

    const promiseToken = Symbol('check');
    const currentPromise = (async () => {
      try {
        const manifest = await fetchManifest({
          baseUrl: updateBaseUrl,
          channel,
        });

        if (!isCheckContextCurrent(context)) {
          return state;
        }

        const target = resolveTarget(manifest);
        latestManifest = manifest;
        latestTarget = target;

        const checkedAt = new Date().toISOString();
        const nextRequiresImmediateUpdate = hasMinimumVersionRequirement(
          currentVersion,
          manifest.minimumSupportedVersion
        );
        const nextCurrentVersionBlocked = hasBlockedCurrentVersion(
          currentVersion,
          manifest.blockedVersions
        );
        const hasNewerVersion = compareVersions(manifest.version, currentVersion) > 0;
        const hasDownloadedCurrentTarget = state.downloadedVersion === manifest.version;
        const rolloutEligible = isRolloutEligible({
          rolloutId: getRolloutId(),
          channel,
          version: manifest.version,
          rolloutPercentage: manifest.rolloutPercentage,
        });

        setLastCheckAt(checkedAt);

        const nextBasePatch: Partial<AppUpdateState> = {
          channel,
          latestVersion: manifest.version,
          releaseNotesUrl: manifest.notesUrl,
          downloadUrl: target.directUrl,
          notesSummary: manifest.notesSummary,
          minimumSupportedVersion: manifest.minimumSupportedVersion,
          blockedVersions: manifest.blockedVersions,
          requiresImmediateUpdate: nextRequiresImmediateUpdate,
          currentVersionBlocked: nextCurrentVersionBlocked,
          lastCheckedAt: checkedAt,
          errorMessage: null,
          downloadedVersion: hasDownloadedCurrentTarget ? state.downloadedVersion : null,
        };

        if (!hasNewerVersion) {
          setState({
            ...nextBasePatch,
            status:
              nextRequiresImmediateUpdate || nextCurrentVersionBlocked ? 'error' : 'idle',
            availableVersion: null,
            errorMessage:
              nextRequiresImmediateUpdate || nextCurrentVersionBlocked
                ? 'Current version is unsupported and no newer update is available.'
                : null,
          });
          return state;
        }

        if (
          !rolloutEligible &&
          !nextRequiresImmediateUpdate &&
          !nextCurrentVersionBlocked &&
          !hasDownloadedCurrentTarget
        ) {
          setState({
            ...nextBasePatch,
            status: 'idle',
            latestVersion: null,
            availableVersion: null,
            releaseNotesUrl: null,
            downloadUrl: null,
            notesSummary: [],
          });
          return state;
        }

        if (
          !interactive &&
          !nextRequiresImmediateUpdate &&
          !nextCurrentVersionBlocked &&
          getSkippedVersion(channel) === manifest.version
        ) {
          setState({
            ...nextBasePatch,
            status: 'idle',
            availableVersion: null,
          });
          return state;
        }

        if (hasDownloadedCurrentTarget) {
          setState({
            ...nextBasePatch,
            status: 'downloaded',
            availableVersion: null,
            downloadProgress: null,
          });
          return state;
        }

        await ensureUpdaterFeedPrimed({
          channel,
          version: manifest.version,
          target,
        });

        if (!isCheckContextCurrent(context)) {
          return state;
        }

        setState({
          ...nextBasePatch,
          status: getAutoDownloadEnabled() ? 'downloading' : 'available',
          availableVersion: manifest.version,
        });

        if (getAutoDownloadEnabled()) {
          await startDownload({
            channel,
            version: manifest.version,
            epoch: context.epoch,
          });
        }

        return state;
      } catch (error) {
        if (isCheckContextCurrent(context)) {
          setState({
            status: 'error',
            errorMessage: normalizeMessage(error),
          });
        }
        return state;
      } finally {
        if (activeCheckPromiseToken === promiseToken) {
          checkPromise = null;
          activeCheckPromiseToken = null;
        }
        if (isCheckContextCurrent(context)) {
          activeCheckContext = null;
        }
      }
    })();

    activeCheckPromiseToken = promiseToken;
    checkPromise = currentPromise;
    return currentPromise;
  };

  const downloadUpdate = async (): Promise<AppUpdateState> => {
    if (downloadPromise || state.status === 'downloading') {
      return downloadPromise ?? state;
    }

    if (!latestTarget && latestManifest) {
      latestTarget = resolveTarget(latestManifest);
    }
    if (!latestTarget) {
      await checkForUpdates({ interactive: true });
    }
    if (!latestTarget) {
      return state;
    }

    const version = latestManifest?.version ?? state.availableVersion ?? state.latestVersion;
    if (!version) {
      return state;
    }

    await ensureUpdaterFeedPrimed({
      channel: currentChannel(),
      version,
      target: latestTarget,
    });

    return startDownload({
      channel: currentChannel(),
      version,
      epoch: channelEpoch,
    });
  };

  const restartToInstall = () => {
    updater.quitAndInstall();
  };

  const setChannel = (channel: UpdateChannel): AppUpdateSettings => {
    setStoredChannel(channel);
    channelEpoch += 1;
    activeCheckContext = null;
    activeDownloadContext = null;
    checkPromise = null;
    downloadPromise = null;
    activeCheckPromiseToken = null;
    activeDownloadPromiseToken = null;
    resetResolvedArtifacts();
    setState({
      channel,
      status: 'idle',
      latestVersion: null,
      availableVersion: null,
      downloadedVersion: null,
      downloadProgress: null,
      releaseNotesUrl: null,
      downloadUrl: null,
      notesSummary: [],
      errorMessage: null,
      minimumSupportedVersion: null,
      blockedVersions: [],
      requiresImmediateUpdate: false,
      currentVersionBlocked: false,
    });
    return getSettings();
  };

  const setAutoCheck = (enabled: boolean): AppUpdateSettings => {
    setAutoCheckEnabled(enabled);
    return getSettings();
  };

  const setAutoDownload = (enabled: boolean): AppUpdateSettings => {
    setAutoDownloadEnabled(enabled);
    updater.autoDownload = enabled;
    return getSettings();
  };

  const skipVersion = (version?: string | null): AppUpdateSettings => {
    if (state.requiresImmediateUpdate || state.currentVersionBlocked) {
      return getSettings();
    }
    const nextVersion = version ?? state.availableVersion ?? state.latestVersion ?? null;
    setSkippedVersion(currentChannel(), nextVersion);
    if (nextVersion && state.latestVersion === nextVersion && state.status === 'available') {
      setState({
        status: 'idle',
        availableVersion: null,
      });
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
      if (currentHandle) {
        scheduledTimers.delete(currentHandle);
      }
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

  const subscribe = (listener: (nextState: AppUpdateState, settings: AppUpdateSettings) => void) => {
    listeners.add(listener);
    listener(state, getSettings());
    return () => {
      listeners.delete(listener);
    };
  };

  const dispose = () => {
    stopAutomaticChecks();
    updater.removeListener('download-progress', handleDownloadProgress);
    updater.removeListener('update-downloaded', handleDownloaded);
    updater.removeListener('error', handleError);
    listeners.clear();
  };

  return {
    getState: () => state,
    getSettings,
    setChannel,
    setAutoCheck,
    setAutoDownload,
    checkForUpdates,
    downloadUpdate,
    restartToInstall,
    skipVersion,
    scheduleAutomaticChecks,
    stopAutomaticChecks,
    subscribe,
    dispose,
  };
};
