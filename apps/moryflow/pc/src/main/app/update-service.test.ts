import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AppUpdateManifest,
  AppUpdateSettings,
  AppUpdateState,
} from '../../shared/ipc/app-update.js';
import { createUpdateService, resolveAutoUpdater } from './update-service.js';

type DownloadProgressPayload = {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
};

const createDeferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

class FakeUpdater {
  autoDownload = true;
  autoInstallOnAppQuit = true;
  latestFeedUrl: string | null = null;
  checkForUpdatesCalled = 0;
  downloadCalled = 0;
  quitAndInstallCalled = 0;
  listeners = new Map<string, Set<(payload?: unknown) => void>>();
  checkForUpdatesImpl = vi.fn(async () => undefined);
  downloadUpdateImpl = vi.fn(async () => undefined);

  on(event: string, listener: (payload?: unknown) => void) {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener);
    this.listeners.set(event, set);
    return this;
  }

  removeListener(event: string, listener: (payload?: unknown) => void) {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  setFeedURL(options: { provider: 'generic'; url: string }) {
    this.latestFeedUrl = options.url;
  }

  async checkForUpdates() {
    this.checkForUpdatesCalled += 1;
    return this.checkForUpdatesImpl();
  }

  async downloadUpdate() {
    this.downloadCalled += 1;
    return this.downloadUpdateImpl();
  }

  quitAndInstall() {
    this.quitAndInstallCalled += 1;
  }

  emit(event: string, payload?: unknown) {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }
}

const createManifest = (overrides: Partial<AppUpdateManifest> = {}): AppUpdateManifest => ({
  channel: 'stable',
  version: '1.4.0',
  publishedAt: '2026-03-08T10:00:00Z',
  notesUrl: 'https://github.com/dvlin-dev/moryflow/releases/tag/v1.4.0',
  notesSummary: ['Faster startup'],
  rolloutPercentage: 100,
  minimumSupportedVersion: '1.3.0',
  blockedVersions: [],
  downloads: {
    'darwin-arm64': {
      feedUrl: 'https://download.moryflow.com/channels/stable/darwin/arm64/latest-mac.yml',
      directUrl:
        'https://download.moryflow.com/releases/v1.4.0/darwin/arm64/MoryFlow-1.4.0-arm64.dmg',
    },
    'darwin-x64': {
      feedUrl: 'https://download.moryflow.com/channels/stable/darwin/x64/latest-mac.yml',
      directUrl: 'https://download.moryflow.com/releases/v1.4.0/darwin/x64/MoryFlow-1.4.0-x64.dmg',
    },
    'win32-x64': {
      feedUrl: 'https://download.moryflow.com/channels/stable/win32/x64/latest.yml',
      directUrl: 'https://download.moryflow.com/releases/v1.4.0/win32/x64/MoryFlow-1.4.0-Setup.exe',
    },
  },
  ...overrides,
});

describe('createUpdateService', () => {
  let updater: FakeUpdater;
  let storedChannel: 'stable' | 'beta';
  let autoCheckEnabled: boolean;
  let autoDownloadEnabled: boolean;
  let lastCheckAt: string | null;
  let skippedVersions: Record<'stable' | 'beta', string | null>;
  let rolloutId: string;

  beforeEach(() => {
    updater = new FakeUpdater();
    storedChannel = 'stable';
    autoCheckEnabled = true;
    autoDownloadEnabled = false;
    lastCheckAt = null;
    skippedVersions = {
      stable: null,
      beta: null,
    };
    rolloutId = 'rollout-device-a';
  });

  const createService = ({
    currentVersion = '1.3.0',
    platform = 'win32' as NodeJS.Platform,
    arch = 'x64',
    fetchManifest = vi.fn(async ({ channel }: { channel: 'stable' | 'beta' }) =>
      createManifest({
        channel,
        version: channel === 'beta' ? '1.5.0-beta.1' : '1.4.0',
        notesUrl: `https://github.com/dvlin-dev/moryflow/releases/tag/v${channel === 'beta' ? '1.5.0-beta.1' : '1.4.0'}`,
      })
    ),
  }: {
    currentVersion?: string;
    platform?: NodeJS.Platform;
    arch?: string;
    fetchManifest?: ReturnType<typeof vi.fn>;
  } = {}) => {
    const service = createUpdateService({
      currentVersion,
      platform,
      arch,
      getStoredChannel: () => storedChannel,
      setStoredChannel: (channel) => {
        storedChannel = channel;
      },
      getAutoCheckEnabled: () => autoCheckEnabled,
      setAutoCheckEnabled: (enabled) => {
        autoCheckEnabled = enabled;
      },
      getAutoDownloadEnabled: () => autoDownloadEnabled,
      setAutoDownloadEnabled: (enabled) => {
        autoDownloadEnabled = enabled;
      },
      getSkippedVersion: (channel) => skippedVersions[channel],
      setSkippedVersion: (channel, version) => {
        skippedVersions[channel] = version;
      },
      getLastCheckAt: () => lastCheckAt,
      setLastCheckAt: (value) => {
        lastCheckAt = value;
      },
      getRolloutId: () => rolloutId,
      fetchManifest,
      updater,
      scheduleTimeout: vi.fn(() => ({ ref: vi.fn(), unref: vi.fn() })),
      clearScheduledTimeout: vi.fn(),
    });

    return {
      service,
      fetchManifest,
    };
  };

  it('reads autoUpdater from a CommonJS-style electron-updater module', () => {
    const candidate = new FakeUpdater();

    expect(resolveAutoUpdater(() => ({ autoUpdater: candidate }))).toBe(candidate);
  });

  it('selects the platform-specific feed and reports available update without auto-download', async () => {
    const { service } = createService({ platform: 'darwin', arch: 'x64' });

    await service.checkForUpdates({ interactive: true });

    const state = service.getState();
    expect(updater.latestFeedUrl).toBe('https://download.moryflow.com/channels/stable/darwin/x64/');
    expect(state.status).toBe('available');
    expect(state.currentVersion).toBe('1.3.0');
    expect(state.latestVersion).toBe('1.4.0');
    expect(state.downloadUrl).toContain('darwin/x64');
    expect(updater.checkForUpdatesCalled).toBe(1);
    expect(updater.downloadCalled).toBe(0);
  });

  it('suppresses skipped versions per channel during non-interactive checks', async () => {
    skippedVersions.beta = '1.5.0-beta.1';
    const { service } = createService();

    service.setChannel('beta');
    await service.checkForUpdates({ interactive: false });
    expect(service.getState().status).toBe('idle');
    expect(service.getState().latestVersion).toBe('1.5.0-beta.1');

    service.setChannel('stable');
    await service.checkForUpdates({ interactive: false });
    expect(service.getState().status).toBe('available');
    expect(service.getSettings().skippedVersion).toBeNull();
  });

  it('deduplicates in-flight downloads and transitions to downloaded on updater event', async () => {
    const deferred = createDeferred<void>();
    updater.downloadUpdateImpl.mockReturnValueOnce(deferred.promise);
    const { service } = createService();

    await service.checkForUpdates({ interactive: true });

    const first = service.downloadUpdate();
    const second = service.downloadUpdate();

    await Promise.resolve();
    expect(updater.downloadCalled).toBe(1);
    updater.emit('download-progress', {
      percent: 25,
      transferred: 25,
      total: 100,
      bytesPerSecond: 1000,
    } satisfies DownloadProgressPayload);
    deferred.resolve();
    updater.emit('update-downloaded');

    await Promise.all([first, second]);

    const state = service.getState();
    expect(state.status).toBe('downloaded');
    expect(state.downloadProgress).toBeNull();
    expect(state.downloadedVersion).toBe('1.4.0');
  });

  it('marks blocked or unsupported current versions as mandatory updates', async () => {
    const { service } = createService({
      fetchManifest: vi.fn(async () =>
        createManifest({
          version: '1.4.0',
          minimumSupportedVersion: '1.3.1',
          blockedVersions: ['1.3.0'],
        })
      ),
    });

    await service.checkForUpdates({ interactive: true });

    expect(service.getState().status).toBe('available');
    expect(service.getState().requiresImmediateUpdate).toBe(true);
    expect(service.getState().currentVersionBlocked).toBe(true);

    const settings = service.skipVersion('1.4.0');
    expect(settings.skippedVersion).toBeNull();
    expect(skippedVersions.stable).toBeNull();
  });

  it('ignores stale check results after the user switches channel', async () => {
    const stableCheck = createDeferred<AppUpdateManifest>();
    const fetchManifest = vi.fn(async ({ channel }: { channel: 'stable' | 'beta' }) => {
      if (channel === 'stable') {
        return stableCheck.promise;
      }
      return createManifest({
        channel: 'beta',
        version: '1.5.0-beta.1',
        notesUrl: 'https://github.com/dvlin-dev/moryflow/releases/tag/v1.5.0-beta.1',
      });
    });
    const { service } = createService({ fetchManifest });

    const inFlight = service.checkForUpdates({ interactive: true });
    service.setChannel('beta');
    await service.checkForUpdates({ interactive: true });

    stableCheck.resolve(createManifest());
    await inFlight;

    const state = service.getState();
    expect(state.channel).toBe('beta');
    expect(state.latestVersion).toBe('1.5.0-beta.1');
    expect(state.releaseNotesUrl).toContain('1.5.0-beta.1');
  });

  it('lets interactive checks supersede in-flight background checks', async () => {
    skippedVersions.stable = '1.4.0';
    const backgroundCheck = createDeferred<AppUpdateManifest>();
    const fetchManifest = vi.fn(async () => createManifest());
    fetchManifest.mockImplementationOnce(async () => backgroundCheck.promise);
    fetchManifest.mockImplementationOnce(async () => createManifest());
    const { service } = createService({ fetchManifest });

    const background = service.checkForUpdates({ interactive: false });
    const interactive = service.checkForUpdates({ interactive: true });

    backgroundCheck.resolve(createManifest());
    await Promise.all([background, interactive]);

    expect(fetchManifest).toHaveBeenCalledTimes(2);
    expect(service.getState().status).toBe('available');
    expect(service.getState().availableVersion).toBe('1.4.0');
  });

  it('falls back to downloaded state when auto-download completes before download context is ready', async () => {
    autoDownloadEnabled = true;
    updater.checkForUpdatesImpl.mockImplementationOnce(async () => {
      updater.emit('update-downloaded');
    });
    const { service } = createService();

    await service.checkForUpdates({ interactive: true });

    expect(service.getState().status).toBe('downloaded');
    expect(service.getState().downloadedVersion).toBe('1.4.0');
  });

  it('preserves downloaded status across subsequent checks for the same version', async () => {
    const { service } = createService();

    await service.checkForUpdates({ interactive: true });
    await service.downloadUpdate();
    updater.emit('update-downloaded');

    await service.checkForUpdates({ interactive: true });

    expect(service.getState().status).toBe('downloaded');
    expect(service.getState().downloadedVersion).toBe('1.4.0');
    expect(service.getState().availableVersion).toBeNull();
  });

  it('uses the active download context version when download completes after a newer check', async () => {
    const deferred = createDeferred<void>();
    updater.downloadUpdateImpl.mockReturnValueOnce(deferred.promise);
    const fetchManifest = vi.fn(async () => createManifest());
    fetchManifest.mockImplementationOnce(async () => createManifest({ version: '1.4.0' }));
    fetchManifest.mockImplementationOnce(async () => createManifest({ version: '1.5.0' }));
    const { service } = createService({ fetchManifest });

    await service.checkForUpdates({ interactive: true });
    const downloadPromise = service.downloadUpdate();
    await service.checkForUpdates({ interactive: true });
    deferred.resolve();
    updater.emit('update-downloaded');
    await downloadPromise;

    expect(service.getState().status).toBe('downloaded');
    expect(service.getState().downloadedVersion).toBe('1.4.0');
    expect(service.getState().latestVersion).toBe('1.5.0');
  });

  it('re-primes the updater feed before downloading a cached target after a failed check', async () => {
    updater.checkForUpdatesImpl
      .mockRejectedValueOnce(new Error('feed priming failed'))
      .mockResolvedValueOnce(undefined);
    const { service } = createService();

    await service.checkForUpdates({ interactive: true });
    expect(service.getState().status).toBe('error');

    await service.downloadUpdate();

    expect(updater.checkForUpdatesCalled).toBe(2);
    expect(updater.downloadCalled).toBe(1);
    expect(service.getState().status).toBe('downloaded');
    expect(service.getState().downloadedVersion).toBe('1.4.0');
  });

  it('gates non-mandatory updates by rollout percentage', async () => {
    rolloutId = 'rollout-device-b';
    const { service } = createService({
      fetchManifest: vi.fn(async () =>
        createManifest({
          rolloutPercentage: 0,
          minimumSupportedVersion: null,
        })
      ),
    });

    await service.checkForUpdates({ interactive: true });

    expect(service.getState().status).toBe('idle');
    expect(service.getState().availableVersion).toBeNull();
    expect(service.getState().downloadUrl).toBeNull();
    expect(service.getState().latestVersion).toBeNull();
  });

  it('broadcasts state and settings changes to subscribers', async () => {
    const snapshots: Array<{ state: AppUpdateState; settings: AppUpdateSettings }> = [];
    const { service } = createService();

    const dispose = service.subscribe((state, settings) => {
      snapshots.push({ state, settings });
    });

    await service.checkForUpdates({ interactive: true });
    service.setChannel('beta');
    dispose();

    expect(snapshots.some((snapshot) => snapshot.state.status === 'checking')).toBe(true);
    expect(snapshots.some((snapshot) => snapshot.state.status === 'available')).toBe(true);
    expect(snapshots.at(-1)?.settings.channel).toBe('beta');
  });

  it('clears previous timers before rescheduling automatic checks', () => {
    const scheduleTimeout = vi.fn(() => ({ ref: vi.fn(), unref: vi.fn() }));
    const clearScheduledTimeout = vi.fn();
    const service = createUpdateService({
      currentVersion: '1.3.0',
      platform: 'win32',
      arch: 'x64',
      getStoredChannel: () => storedChannel,
      setStoredChannel: (channel) => {
        storedChannel = channel;
      },
      getAutoCheckEnabled: () => autoCheckEnabled,
      setAutoCheckEnabled: (enabled) => {
        autoCheckEnabled = enabled;
      },
      getAutoDownloadEnabled: () => autoDownloadEnabled,
      setAutoDownloadEnabled: (enabled) => {
        autoDownloadEnabled = enabled;
      },
      getSkippedVersion: (channel) => skippedVersions[channel],
      setSkippedVersion: (channel, version) => {
        skippedVersions[channel] = version;
      },
      getLastCheckAt: () => lastCheckAt,
      setLastCheckAt: (value) => {
        lastCheckAt = value;
      },
      getRolloutId: () => rolloutId,
      fetchManifest: vi.fn(async () => createManifest()),
      updater,
      scheduleTimeout,
      clearScheduledTimeout,
    });

    service.scheduleAutomaticChecks(1_000, 2_000);
    service.scheduleAutomaticChecks(1_000, 2_000);

    expect(scheduleTimeout).toHaveBeenCalledTimes(2);
    expect(clearScheduledTimeout).toHaveBeenCalledTimes(1);
  });

  it('removes fired timer handles before scheduling the next automatic check', () => {
    type ScheduledHandle = {
      id: number;
      ref: ReturnType<typeof vi.fn>;
      unref: ReturnType<typeof vi.fn>;
    };
    const scheduled: Array<{ handle: ScheduledHandle; callback: () => void }> = [];
    let nextId = 0;
    const scheduleTimeout = vi.fn((callback: () => void) => {
      const handle = { id: ++nextId, ref: vi.fn(), unref: vi.fn() };
      scheduled.push({ handle, callback });
      return handle;
    });
    const clearScheduledTimeout = vi.fn();
    const service = createUpdateService({
      currentVersion: '1.3.0',
      platform: 'win32',
      arch: 'x64',
      getStoredChannel: () => storedChannel,
      setStoredChannel: (channel) => {
        storedChannel = channel;
      },
      getAutoCheckEnabled: () => autoCheckEnabled,
      setAutoCheckEnabled: (enabled) => {
        autoCheckEnabled = enabled;
      },
      getAutoDownloadEnabled: () => autoDownloadEnabled,
      setAutoDownloadEnabled: (enabled) => {
        autoDownloadEnabled = enabled;
      },
      getSkippedVersion: (channel) => skippedVersions[channel],
      setSkippedVersion: (channel, version) => {
        skippedVersions[channel] = version;
      },
      getLastCheckAt: () => lastCheckAt,
      setLastCheckAt: (value) => {
        lastCheckAt = value;
      },
      getRolloutId: () => rolloutId,
      fetchManifest: vi.fn(async () => createManifest()),
      updater,
      scheduleTimeout,
      clearScheduledTimeout,
    });

    service.scheduleAutomaticChecks(1_000, 2_000);
    scheduled[0]?.callback();
    scheduled[1]?.callback();
    service.stopAutomaticChecks();

    expect(scheduleTimeout).toHaveBeenCalledTimes(3);
    expect(clearScheduledTimeout).toHaveBeenCalledTimes(1);
    expect(clearScheduledTimeout).toHaveBeenCalledWith(scheduled[2]?.handle);
  });
});
