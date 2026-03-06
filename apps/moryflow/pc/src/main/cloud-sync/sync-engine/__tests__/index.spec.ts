/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { syncDiffMock } = vi.hoisted(() => ({
  syncDiffMock: vi.fn(),
}));

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

vi.mock('../../store.js', () => ({
  readSettings: vi.fn(() => ({
    syncEnabled: true,
    vectorizeEnabled: false,
    deviceId: 'device-1',
    deviceName: 'Device 1',
  })),
  readBinding: vi.fn(() => null),
}));

vi.mock('../../api/client.js', () => ({
  cloudSyncApi: {
    syncDiff: syncDiffMock,
    syncCommit: vi.fn(async () => ({ success: true })),
    deleteVector: vi.fn(async () => undefined),
  },
  CloudSyncApiError: class CloudSyncApiError extends Error {
    isUnauthorized = false;
    isServerError = false;
  },
}));

vi.mock('../executor.js', () => ({
  detectLocalChanges: vi.fn(async () => ({
    dtos: [],
    pendingChanges: new Map(),
    localStates: new Map(),
  })),
  executeActionsWithTracking: vi.fn(async () => ({
    completed: [],
    deleted: [],
    downloadedEntries: [],
    conflictEntries: [],
    errors: [],
  })),
  applyChangesToFileIndex: vi.fn(async () => undefined),
  getRelativePath: vi.fn((vaultPath: string, filePath: string) =>
    filePath.startsWith(vaultPath) ? filePath.slice(vaultPath.length + 1) : filePath
  ),
}));

vi.mock('../scheduler.js', () => ({
  scheduleSync: vi.fn(),
  cancelScheduledSync: vi.fn(),
  scheduleVectorize: vi.fn(),
  cancelAllVectorize: vi.fn(),
  cancelVectorize: vi.fn(),
}));

vi.mock('../activity-tracker.js', () => ({
  activityTracker: {
    startSync: vi.fn(),
    endSync: vi.fn(),
    clearPending: vi.fn(),
    addPending: vi.fn(),
    removePending: vi.fn(),
    reset: vi.fn(),
    getStatusDetail: vi.fn((status, lastSyncAt, error) => ({
      engineStatus: status,
      recentActivities: [],
      pendingFiles: [],
      lastSyncAt,
      error,
    })),
  },
}));

vi.mock('../../logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../../errors.js', () => ({
  isNetworkError: vi.fn(() => false),
}));

vi.mock('../../auto-binding.js', () => ({
  tryAutoBinding: vi.fn(async () => null),
  resetAutoBindingState: vi.fn(),
  setRetryCallback: vi.fn(),
}));

vi.mock('../../binding-conflict.js', () => ({
  checkAndResolveBindingConflict: vi.fn(async () => ({ hasConflict: false })),
}));

vi.mock('../../file-index/index.js', () => ({
  fileIndexManager: {
    load: vi.fn(async () => undefined),
    scanAndCreateIds: vi.fn(async () => 0),
    clearCache: vi.fn(),
    delete: vi.fn(async () => null),
    move: vi.fn(async () => undefined),
  },
}));

import { cloudSyncEngine } from '../index';
import { syncState } from '../state';

describe('cloudSyncEngine triggerSync offline behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncState.reset();
    syncState.setVault('/vault', 'vault-1');
    syncState.setError(undefined);
    syncDiffMock.mockResolvedValue({ actions: [] });
  });

  it('does not sync while offline because of user choice', async () => {
    syncState.setStatus('offline', 'user');

    cloudSyncEngine.triggerSync();
    await Promise.resolve();

    expect(syncDiffMock).not.toHaveBeenCalled();
  });

  it('retries sync while offline because of error', async () => {
    syncState.setStatus('offline', 'error');

    cloudSyncEngine.triggerSync();

    await vi.waitFor(() => {
      expect(syncDiffMock).toHaveBeenCalled();
    });
  });
});
