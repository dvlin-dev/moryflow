import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AppUpdateSettings,
  AppUpdateState,
} from '../../shared/ipc/app-update.js';
import {
  createUpdateService,
  resolveAutoUpdater,
  type UpdaterLike,
  type UpdateService,
} from './update-service.js';

// ---------------------------------------------------------------------------
// FakeUpdater — minimal event-emitting stub that satisfies UpdaterLike
// ---------------------------------------------------------------------------

class FakeUpdater implements UpdaterLike {
  autoDownload = true;
  autoInstallOnAppQuit = true;

  checkForUpdatesCalled = 0;
  downloadCalled = 0;
  quitAndInstallCalled = 0;

  private listeners = new Map<string, Set<(payload?: unknown) => void>>();

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

  async checkForUpdates() {
    this.checkForUpdatesCalled += 1;
    return this.checkForUpdatesImpl();
  }

  async downloadUpdate() {
    this.downloadCalled += 1;
    return this.downloadUpdateImpl();
  }

  quitAndInstallImpl = vi.fn();

  quitAndInstall(_isSilent?: boolean, _isForceRunAfter?: boolean) {
    this.quitAndInstallCalled += 1;
    this.quitAndInstallImpl();
  }

  emit(event: string, payload?: unknown) {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createDeferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveAutoUpdater', () => {
  it('returns autoUpdater when the module exports it', () => {
    const fake = new FakeUpdater();
    const result = resolveAutoUpdater(() => ({ autoUpdater: fake }));
    expect(result).toBe(fake);
  });

  it('throws when the module does not expose autoUpdater', () => {
    expect(() => resolveAutoUpdater(() => ({}))).toThrow(
      'electron-updater.autoUpdater is unavailable.'
    );
  });

  it('throws when the module returns undefined', () => {
    expect(() => resolveAutoUpdater(() => undefined)).toThrow(
      'electron-updater.autoUpdater is unavailable.'
    );
  });
});

describe('createUpdateService', () => {
  let updater: FakeUpdater;
  let autoDownloadEnabled: boolean;
  let skippedVersion: string | null;
  let lastCheckAt: string | null;

  beforeEach(() => {
    updater = new FakeUpdater();
    autoDownloadEnabled = false;
    skippedVersion = null;
    lastCheckAt = null;
  });

  const createService = ({
    currentVersion = '1.0.0',
    platform = 'darwin' as NodeJS.Platform,
    isPackaged = true,
    forceRestart,
    scheduleTimeout = vi.fn(() => ({ ref: vi.fn(), unref: vi.fn() })),
    clearScheduledTimeout = vi.fn(),
  }: {
    currentVersion?: string;
    platform?: NodeJS.Platform;
    isPackaged?: boolean;
    forceRestart?: () => void;
    scheduleTimeout?: ReturnType<typeof vi.fn>;
    clearScheduledTimeout?: ReturnType<typeof vi.fn>;
  } = {}): { service: UpdateService; scheduleTimeout: ReturnType<typeof vi.fn>; clearScheduledTimeout: ReturnType<typeof vi.fn> } => {
    const service = createUpdateService({
      currentVersion,
      platform,
      isPackaged,
      getAutoDownloadEnabled: () => autoDownloadEnabled,
      setAutoDownloadEnabled: (enabled) => {
        autoDownloadEnabled = enabled;
      },
      getSkippedVersion: () => skippedVersion,
      setSkippedVersion: (version) => {
        skippedVersion = version;
      },
      getLastCheckAt: () => lastCheckAt,
      setLastCheckAt: (value) => {
        lastCheckAt = value;
      },
      updater,
      forceRestart,
      scheduleTimeout,
      clearScheduledTimeout,
    });

    return { service, scheduleTimeout, clearScheduledTimeout };
  };

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('starts idle on supported platform (packaged macOS)', () => {
      const { service } = createService();
      const state = service.getState();

      expect(state.status).toBe('idle');
      expect(state.currentVersion).toBe('1.0.0');
      expect(state.availableVersion).toBeNull();
      expect(state.downloadedVersion).toBeNull();
      expect(state.releaseNotesUrl).toBeNull();
      expect(state.errorMessage).toBeNull();
      expect(state.downloadProgress).toBeNull();
    });

    it('starts idle with error message on unsupported platform (linux)', () => {
      const { service } = createService({ platform: 'linux' });
      const state = service.getState();

      expect(state.status).toBe('idle');
      expect(state.errorMessage).toBe(
        'Automatic updates are only supported on packaged macOS builds.'
      );
    });

    it('starts idle with error message when not packaged', () => {
      const { service } = createService({ isPackaged: false });
      const state = service.getState();

      expect(state.status).toBe('idle');
      expect(state.errorMessage).toBe(
        'Automatic updates are only supported on packaged macOS builds.'
      );
    });

    it('disables updater autoDownload and autoInstallOnAppQuit', () => {
      createService();
      expect(updater.autoDownload).toBe(false);
      expect(updater.autoInstallOnAppQuit).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // checkForUpdates
  // -------------------------------------------------------------------------

  describe('checkForUpdates', () => {
    it('returns current state immediately on unsupported platform', async () => {
      const { service } = createService({ platform: 'linux' });
      const state = await service.checkForUpdates();

      expect(state.status).toBe('idle');
      expect(updater.checkForUpdatesCalled).toBe(0);
    });

    it('transitions to checking, then available when update-available fires', async () => {
      const { service } = createService();
      const states: string[] = [];
      service.subscribe((s) => states.push(s.status));

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      const result = await checking;

      expect(states).toContain('checking');
      expect(result.status).toBe('available');
      expect(result.availableVersion).toBe('2.0.0');
      expect(result.releaseNotesUrl).toBe(
        'https://github.com/dvlin-dev/moryflow/releases/tag/v2.0.0'
      );
    });

    it('transitions to idle when update-not-available fires', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-not-available');
      const result = await checking;

      expect(result.status).toBe('idle');
      expect(result.availableVersion).toBeNull();
      expect(result.errorMessage).toBeNull();
    });

    it('transitions to error when error event fires during check', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('error', new Error('network unavailable'));
      const result = await checking;

      expect(result.status).toBe('error');
      expect(result.errorMessage).toBe('network unavailable');
    });

    it('transitions to error when updater.checkForUpdates throws', async () => {
      updater.checkForUpdatesImpl.mockRejectedValueOnce(new Error('DNS failure'));
      const { service } = createService();

      const result = await service.checkForUpdates();
      expect(result.status).toBe('error');
      expect(result.errorMessage).toBe('DNS failure');
    });

    it('normalizes non-Error payloads to a generic message', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('error', 'some string error');
      const result = await checking;

      expect(result.errorMessage).toBe('Update operation failed.');
    });

    it('updates lastCheckedAt on update-available', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      const result = await checking;

      expect(result.lastCheckedAt).toBeTruthy();
      expect(lastCheckAt).toBeTruthy();
    });

    it('updates lastCheckedAt on update-not-available', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-not-available');
      await checking;

      expect(lastCheckAt).toBeTruthy();
    });

    it('deduplicates concurrent check calls', async () => {
      const { service } = createService();

      const first = service.checkForUpdates();
      const second = service.checkForUpdates();
      updater.emit('update-not-available');

      const [r1, r2] = await Promise.all([first, second]);
      expect(r1).toEqual(r2);
      expect(updater.checkForUpdatesCalled).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Skip version
  // -------------------------------------------------------------------------

  describe('skip version behavior', () => {
    it('skips update-available during silent (non-interactive) check', async () => {
      skippedVersion = '2.0.0';
      const { service } = createService();

      const checking = service.checkForUpdates({ interactive: false });
      updater.emit('update-available', { version: '2.0.0' });
      const result = await checking;

      expect(result.status).toBe('idle');
    });

    it('does NOT skip update-available during interactive check', async () => {
      skippedVersion = '2.0.0';
      const { service } = createService();

      const checking = service.checkForUpdates({ interactive: true });
      updater.emit('update-available', { version: '2.0.0' });
      const result = await checking;

      expect(result.status).toBe('available');
      expect(result.availableVersion).toBe('2.0.0');
    });

    it('promotes a background check to interactive when interactive call arrives', async () => {
      skippedVersion = '2.0.0';
      const { service } = createService();

      const background = service.checkForUpdates({ interactive: false });
      const interactive = service.checkForUpdates({ interactive: true });
      updater.emit('update-available', { version: '2.0.0' });

      const [bgResult, intResult] = await Promise.all([background, interactive]);
      // Both should see 'available' because interactive superseded background
      expect(bgResult.status).toBe('available');
      expect(intResult.status).toBe('available');
    });
  });

  // -------------------------------------------------------------------------
  // Auto-download
  // -------------------------------------------------------------------------

  describe('auto-download behavior', () => {
    it('automatically starts download when autoDownload is enabled and update-available fires', async () => {
      autoDownloadEnabled = true;
      const { service } = createService();

      const checking = service.checkForUpdates({ interactive: true });
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      // Auto-download should have triggered downloadUpdate
      expect(updater.downloadCalled).toBe(1);
    });

    it('does NOT auto-download when autoDownload is disabled', async () => {
      autoDownloadEnabled = false;
      const { service } = createService();

      const checking = service.checkForUpdates({ interactive: true });
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      expect(updater.downloadCalled).toBe(0);
    });

    it('does NOT auto-download when skipped version matches (silent check)', async () => {
      autoDownloadEnabled = true;
      skippedVersion = '2.0.0';
      const { service } = createService();

      const checking = service.checkForUpdates({ interactive: false });
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      expect(updater.downloadCalled).toBe(0);
    });

    it('preserves downloaded state when same version is re-discovered', async () => {
      autoDownloadEnabled = true;
      const { service } = createService();

      // First: check → available → download → downloaded
      const checking1 = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking1;

      const downloading = service.downloadUpdate();
      updater.emit('update-downloaded', { version: '2.0.0' });
      await downloading;

      expect(service.getState().status).toBe('downloaded');
      expect(service.getState().downloadedVersion).toBe('2.0.0');

      // Second check discovers same version — should NOT re-download
      const checking2 = service.checkForUpdates({ interactive: false });
      updater.emit('update-available', { version: '2.0.0' });
      await checking2;

      expect(service.getState().status).toBe('downloaded');
      expect(service.getState().downloadedVersion).toBe('2.0.0');
      expect(updater.downloadCalled).toBe(1); // only once, not twice
    });
  });

  // -------------------------------------------------------------------------
  // downloadUpdate
  // -------------------------------------------------------------------------

  describe('downloadUpdate', () => {
    it('transitions to downloading and then downloaded', async () => {
      const { service } = createService();

      // First, make an update available
      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const downloading = service.downloadUpdate();
      updater.emit('update-downloaded', { version: '2.0.0' });
      const result = await downloading;

      expect(result.status).toBe('downloaded');
      expect(result.downloadedVersion).toBe('2.0.0');
      expect(result.availableVersion).toBeNull();
      expect(result.downloadProgress).toBeNull();
    });

    it('sets autoInstallOnAppQuit when download completes', async () => {
      const { service } = createService();

      expect(updater.autoInstallOnAppQuit).toBe(false);

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const downloading = service.downloadUpdate();
      updater.emit('update-downloaded', { version: '2.0.0' });
      await downloading;

      expect(updater.autoInstallOnAppQuit).toBe(true);
    });

    it('returns current state on unsupported platform', async () => {
      const { service } = createService({ platform: 'win32' });
      const result = await service.downloadUpdate();
      expect(result.status).toBe('idle');
      expect(updater.downloadCalled).toBe(0);
    });

    it('returns immediately if already in downloaded state', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const dl = service.downloadUpdate();
      updater.emit('update-downloaded', { version: '2.0.0' });
      await dl;

      // Second call should return immediately
      const result = await service.downloadUpdate();
      expect(result.status).toBe('downloaded');
      expect(updater.downloadCalled).toBe(1); // still just 1
    });

    it('deduplicates concurrent download calls', async () => {
      const deferred = createDeferred<void>();
      updater.downloadUpdateImpl.mockReturnValueOnce(deferred.promise);
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const first = service.downloadUpdate();
      const second = service.downloadUpdate();

      expect(updater.downloadCalled).toBe(1);

      deferred.resolve();
      updater.emit('update-downloaded', { version: '2.0.0' });

      const [r1, r2] = await Promise.all([first, second]);
      expect(r1.status).toBe('downloaded');
      expect(r2.status).toBe('downloaded');
    });

    it('transitions to error when error fires during download', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const downloading = service.downloadUpdate();
      updater.emit('error', new Error('disk full'));
      const result = await downloading;

      expect(result.status).toBe('error');
      expect(result.errorMessage).toBe('disk full');
    });

    it('transitions to error when updater.downloadUpdate throws', async () => {
      updater.downloadUpdateImpl.mockRejectedValueOnce(new Error('write error'));
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const result = await service.downloadUpdate();
      expect(result.status).toBe('error');
      expect(result.errorMessage).toBe('write error');
    });

    it('falls back to availableVersion when update-downloaded payload has no version', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const downloading = service.downloadUpdate();
      updater.emit('update-downloaded', {}); // no version in payload
      const result = await downloading;

      expect(result.downloadedVersion).toBe('2.0.0');
    });
  });

  // -------------------------------------------------------------------------
  // download-progress
  // -------------------------------------------------------------------------

  describe('download-progress', () => {
    it('updates state with progress data', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      void service.downloadUpdate();

      updater.emit('download-progress', {
        percent: 50,
        transferred: 500,
        total: 1000,
        bytesPerSecond: 250,
      });

      const state = service.getState();
      expect(state.status).toBe('downloading');
      expect(state.downloadProgress).toEqual({
        percent: 50,
        transferred: 500,
        total: 1000,
        bytesPerSecond: 250,
      });
    });

    it('ignores invalid progress payloads', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      void service.downloadUpdate();

      // Emit invalid progress (missing fields)
      updater.emit('download-progress', { percent: 50 });

      const state = service.getState();
      // Should still be downloading but with null progress (from the setState in startDownload)
      expect(state.downloadProgress).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // restartToInstall
  // -------------------------------------------------------------------------

  describe('restartToInstall', () => {
    it('transitions to restarting and calls updater.quitAndInstall', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const downloading = service.downloadUpdate();
      updater.emit('update-downloaded', { version: '2.0.0' });
      await downloading;

      service.restartToInstall();
      expect(service.getState().status).toBe('restarting');
      expect(updater.quitAndInstallCalled).toBe(1);
      expect(updater.autoInstallOnAppQuit).toBe(true);
    });

    it('throws when not in downloaded state', () => {
      const { service } = createService();

      expect(() => service.restartToInstall()).toThrow(
        'No downloaded release is available to install.'
      );
    });

    it('throws when in available state (not yet downloaded)', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      expect(() => service.restartToInstall()).toThrow(
        'No downloaded release is available to install.'
      );
    });

    it('transitions to error when quitAndInstall throws (does not force restart)', async () => {
      const forceRestart = vi.fn();
      const { service } = createService({ forceRestart });

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const downloading = service.downloadUpdate();
      updater.emit('update-downloaded', { version: '2.0.0' });
      await downloading;

      updater.quitAndInstallImpl.mockImplementationOnce(() => {
        throw new Error('install failed');
      });
      service.restartToInstall();

      expect(forceRestart).not.toHaveBeenCalled();
      expect(service.getState().status).toBe('error');
      expect(service.getState().errorMessage).toContain('Restart failed');
    });

    it('schedules forceRestart as safety net when quitAndInstall does not throw', async () => {
      const forceRestart = vi.fn();
      const scheduleTimeout = vi.fn(() => ({ ref: vi.fn(), unref: vi.fn() }));
      const { service } = createService({ forceRestart, scheduleTimeout });

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const downloading = service.downloadUpdate();
      updater.emit('update-downloaded', { version: '2.0.0' });
      await downloading;

      service.restartToInstall();

      expect(forceRestart).not.toHaveBeenCalled();
      // Safety net timer should be scheduled (last call to scheduleTimeout)
      const lastCall = scheduleTimeout.mock.calls[scheduleTimeout.mock.calls.length - 1]!;
      expect(lastCall[1]).toBe(5000);

      // Fire the safety net
      (lastCall[0] as () => void)();
      expect(forceRestart).toHaveBeenCalledTimes(1);
    });

    it('cancels safety net timer when handleError fires before timeout', async () => {
      const forceRestart = vi.fn();
      const clearScheduledTimeout = vi.fn();
      const scheduleTimeout = vi.fn(() => ({ ref: vi.fn(), unref: vi.fn() }));
      const { service } = createService({ forceRestart, scheduleTimeout, clearScheduledTimeout });

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const downloading = service.downloadUpdate();
      updater.emit('update-downloaded', { version: '2.0.0' });
      await downloading;

      service.restartToInstall();
      expect(service.getState().status).toBe('restarting');

      // electron-updater fires error while safety net timer is pending
      updater.emit('error', new Error('signature mismatch'));

      expect(service.getState().status).toBe('error');
      expect(clearScheduledTimeout).toHaveBeenCalled();
      expect(forceRestart).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // skipVersion
  // -------------------------------------------------------------------------

  describe('skipVersion', () => {
    it('sets the skipped version and transitions from available to idle', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const settings = service.skipVersion();

      expect(settings.skippedVersion).toBe('2.0.0');
      expect(skippedVersion).toBe('2.0.0');
      expect(service.getState().status).toBe('idle');
      expect(service.getState().availableVersion).toBeNull();
    });

    it('accepts an explicit version parameter', () => {
      const { service } = createService();

      const settings = service.skipVersion('3.0.0');
      expect(settings.skippedVersion).toBe('3.0.0');
      expect(skippedVersion).toBe('3.0.0');
    });

    it('clears the skipped version when called with null', async () => {
      skippedVersion = '2.0.0';
      const { service } = createService();

      const settings = service.skipVersion(null);
      expect(settings.skippedVersion).toBeNull();
      expect(skippedVersion).toBeNull();
    });

    it('does not transition state when not in available status', () => {
      const { service } = createService();

      service.skipVersion('2.0.0');
      expect(service.getState().status).toBe('idle');
    });

    it('transitions from downloaded to idle, clears downloadedVersion and resets autoInstallOnAppQuit', async () => {
      const { service } = createService();

      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      const downloading = service.downloadUpdate();
      updater.emit('update-downloaded', { version: '2.0.0' });
      await downloading;

      expect(service.getState().status).toBe('downloaded');
      expect(updater.autoInstallOnAppQuit).toBe(true);

      service.skipVersion();

      expect(service.getState().status).toBe('idle');
      expect(service.getState().downloadedVersion).toBeNull();
      expect(skippedVersion).toBe('2.0.0');
      expect(updater.autoInstallOnAppQuit).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // setAutoDownload
  // -------------------------------------------------------------------------

  describe('setAutoDownload', () => {
    it('updates the autoDownload setting', () => {
      const { service } = createService();

      const settings = service.setAutoDownload(true);
      expect(settings.autoDownload).toBe(true);
      expect(autoDownloadEnabled).toBe(true);

      const settings2 = service.setAutoDownload(false);
      expect(settings2.autoDownload).toBe(false);
      expect(autoDownloadEnabled).toBe(false);
    });

    it('always keeps updater.autoDownload false (service handles downloads)', () => {
      const { service } = createService();

      service.setAutoDownload(true);
      expect(updater.autoDownload).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // getSettings
  // -------------------------------------------------------------------------

  describe('getSettings', () => {
    it('returns current settings', () => {
      autoDownloadEnabled = true;
      skippedVersion = '1.5.0';
      lastCheckAt = '2026-01-01T00:00:00Z';

      const { service } = createService();
      const settings = service.getSettings();

      expect(settings).toEqual({
        autoDownload: true,
        skippedVersion: '1.5.0',
        lastCheckAt: '2026-01-01T00:00:00Z',
      });
    });
  });

  // -------------------------------------------------------------------------
  // subscribe
  // -------------------------------------------------------------------------

  describe('subscribe', () => {
    it('immediately delivers current state and settings', () => {
      const { service } = createService();
      const snapshots: Array<{ state: AppUpdateState; settings: AppUpdateSettings }> = [];

      service.subscribe((state, settings) => {
        snapshots.push({ state, settings });
      });

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]!.state.status).toBe('idle');
    });

    it('broadcasts state changes to all subscribers', async () => {
      const { service } = createService();
      const statuses1: string[] = [];
      const statuses2: string[] = [];

      service.subscribe((s) => statuses1.push(s.status));
      service.subscribe((s) => statuses2.push(s.status));

      const checking = service.checkForUpdates();
      updater.emit('update-not-available');
      await checking;

      // Both should have received: initial idle, checking, idle (from not-available)
      expect(statuses1).toEqual(['idle', 'checking', 'idle']);
      expect(statuses2).toEqual(['idle', 'checking', 'idle']);
    });

    it('returns an unsubscribe function', async () => {
      const { service } = createService();
      const statuses: string[] = [];

      const unsubscribe = service.subscribe((s) => statuses.push(s.status));
      unsubscribe();

      const checking = service.checkForUpdates();
      updater.emit('update-not-available');
      await checking;

      // Only the initial delivery before unsubscribe
      expect(statuses).toEqual(['idle']);
    });
  });

  // -------------------------------------------------------------------------
  // dispose
  // -------------------------------------------------------------------------

  describe('dispose', () => {
    it('removes all updater event listeners', () => {
      const { service } = createService();

      expect(updater.listenerCount('update-available')).toBe(1);
      expect(updater.listenerCount('update-not-available')).toBe(1);
      expect(updater.listenerCount('download-progress')).toBe(1);
      expect(updater.listenerCount('update-downloaded')).toBe(1);
      expect(updater.listenerCount('error')).toBe(1);

      service.dispose();

      expect(updater.listenerCount('update-available')).toBe(0);
      expect(updater.listenerCount('update-not-available')).toBe(0);
      expect(updater.listenerCount('download-progress')).toBe(0);
      expect(updater.listenerCount('update-downloaded')).toBe(0);
      expect(updater.listenerCount('error')).toBe(0);
    });

    it('clears all subscribers', () => {
      const { service } = createService();
      const statuses: string[] = [];

      service.subscribe((s) => statuses.push(s.status));
      service.dispose();

      // Manually trigger a state change — subscriber should not receive it
      // (we can't easily trigger after dispose since listeners are removed,
      //  but we can verify the subscriber set was cleared)
      expect(statuses).toEqual(['idle']); // only initial delivery
    });

    it('does not remove listeners on unsupported platform', () => {
      const { service } = createService({ platform: 'linux' });

      // No listeners should have been registered
      expect(updater.listenerCount('update-available')).toBe(0);

      // dispose should not throw
      service.dispose();
    });
  });

  // -------------------------------------------------------------------------
  // scheduleAutomaticChecks
  // -------------------------------------------------------------------------

  describe('scheduleAutomaticChecks', () => {
    it('schedules initial timeout with given delay', () => {
      const scheduleTimeout = vi.fn(() => ({ ref: vi.fn(), unref: vi.fn() }));
      const { service } = createService({ scheduleTimeout });

      service.scheduleAutomaticChecks(5_000, 60_000);
      expect(scheduleTimeout).toHaveBeenCalledTimes(1);
      expect(scheduleTimeout).toHaveBeenCalledWith(expect.any(Function), 5_000);
    });

    it('clears previous timers when rescheduling', () => {
      const scheduleTimeout = vi.fn(() => ({ ref: vi.fn(), unref: vi.fn() }));
      const clearScheduledTimeout = vi.fn();
      const { service } = createService({ scheduleTimeout, clearScheduledTimeout });

      service.scheduleAutomaticChecks(1_000, 2_000);
      service.scheduleAutomaticChecks(1_000, 2_000);

      expect(scheduleTimeout).toHaveBeenCalledTimes(2);
      expect(clearScheduledTimeout).toHaveBeenCalledTimes(1);
    });

    it('fires the initial callback, then schedules the next interval', () => {
      type Handle = { id: number; ref: ReturnType<typeof vi.fn>; unref: ReturnType<typeof vi.fn> };
      const scheduled: Array<{ handle: Handle; callback: () => void }> = [];
      let nextId = 0;
      const scheduleTimeout = vi.fn((callback: () => void, _delay: number) => {
        const handle = { id: ++nextId, ref: vi.fn(), unref: vi.fn() };
        scheduled.push({ handle, callback });
        return handle;
      });
      const clearScheduledTimeout = vi.fn();
      const { service } = createService({ scheduleTimeout, clearScheduledTimeout });

      service.scheduleAutomaticChecks(1_000, 60_000);

      // Fire the initial timer
      scheduled[0]!.callback();

      expect(scheduleTimeout).toHaveBeenCalledTimes(2);
      expect(scheduleTimeout).toHaveBeenLastCalledWith(expect.any(Function), 60_000);

      // Fire the interval timer
      scheduled[1]!.callback();

      expect(scheduleTimeout).toHaveBeenCalledTimes(3);
      expect(scheduleTimeout).toHaveBeenLastCalledWith(expect.any(Function), 60_000);
    });

    it('removes fired timer handles before scheduling the next', () => {
      type Handle = { id: number; ref: ReturnType<typeof vi.fn>; unref: ReturnType<typeof vi.fn> };
      const scheduled: Array<{ handle: Handle; callback: () => void }> = [];
      let nextId = 0;
      const scheduleTimeout = vi.fn((callback: () => void) => {
        const handle = { id: ++nextId, ref: vi.fn(), unref: vi.fn() };
        scheduled.push({ handle, callback });
        return handle;
      });
      const clearScheduledTimeout = vi.fn();
      const { service } = createService({ scheduleTimeout, clearScheduledTimeout });

      service.scheduleAutomaticChecks(1_000, 2_000);
      scheduled[0]!.callback(); // fires initial, schedules interval
      scheduled[1]!.callback(); // fires interval, schedules next
      service.stopAutomaticChecks();

      // Only the latest (unfired) handle should be cleared
      expect(clearScheduledTimeout).toHaveBeenCalledTimes(1);
      expect(clearScheduledTimeout).toHaveBeenCalledWith(scheduled[2]!.handle);
    });
  });

  // -------------------------------------------------------------------------
  // stopAutomaticChecks
  // -------------------------------------------------------------------------

  describe('stopAutomaticChecks', () => {
    it('clears all scheduled timers', () => {
      const handle = { ref: vi.fn(), unref: vi.fn() };
      const scheduleTimeout = vi.fn(() => handle);
      const clearScheduledTimeout = vi.fn();
      const { service } = createService({ scheduleTimeout, clearScheduledTimeout });

      service.scheduleAutomaticChecks(1_000, 2_000);
      service.stopAutomaticChecks();

      expect(clearScheduledTimeout).toHaveBeenCalledWith(handle);
    });

    it('is safe to call when no checks are scheduled', () => {
      const clearScheduledTimeout = vi.fn();
      const { service } = createService({ clearScheduledTimeout });

      expect(() => service.stopAutomaticChecks()).not.toThrow();
      expect(clearScheduledTimeout).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Full lifecycle integration
  // -------------------------------------------------------------------------

  describe('full lifecycle', () => {
    it('tracks checking -> available -> downloading -> downloaded', async () => {
      const { service } = createService();
      const statuses: string[] = [];
      service.subscribe((s) => statuses.push(s.status));

      // Check
      const checking = service.checkForUpdates();
      updater.emit('update-available', { version: '2.0.0' });
      await checking;

      // Download
      const downloading = service.downloadUpdate();
      updater.emit('download-progress', {
        percent: 50,
        transferred: 500,
        total: 1000,
        bytesPerSecond: 250,
      });
      updater.emit('update-downloaded', { version: '2.0.0' });
      await downloading;

      // Install
      service.restartToInstall();

      expect(statuses).toContain('idle');      // initial
      expect(statuses).toContain('checking');
      expect(statuses).toContain('available');
      expect(statuses).toContain('downloading');
      expect(statuses).toContain('downloaded');
      expect(statuses).toContain('restarting');
      expect(updater.quitAndInstallCalled).toBe(1);
    });
  });
});
