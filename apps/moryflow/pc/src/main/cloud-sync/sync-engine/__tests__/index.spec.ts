/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { syncDiffMock } = vi.hoisted(() => ({
  syncDiffMock: vi.fn(),
}));

const { getMembershipConfigMock } = vi.hoisted(() => ({
  getMembershipConfigMock: vi.fn(() => ({
    enabled: true,
    apiUrl: 'https://server.moryflow.com',
    token: 'token-1',
  })),
}));

const { readSettingsMock, readBindingMock } = vi.hoisted(() => ({
  readSettingsMock: vi.fn(() => ({
    syncEnabled: true,
    deviceId: 'device-1',
    deviceName: 'Device 1',
  })),
  readBindingMock: vi.fn(() => null),
}));

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

vi.mock('../../store.js', () => ({
  readSettings: readSettingsMock,
  readBinding: readBindingMock,
}));

vi.mock('../../api/client.js', () => ({
  cloudSyncApi: {
    syncDiff: syncDiffMock,
    syncCommit: vi.fn(async () => ({ success: true })),
  },
  CloudSyncApiError: class CloudSyncApiError extends Error {
    isUnauthorized = false;
    isServerError = false;
  },
}));

vi.mock('../../../membership-bridge.js', () => ({
  membershipBridge: {
    getConfig: getMembershipConfigMock,
  },
}));

vi.mock('../executor.js', () => ({
  detectLocalChanges: vi.fn(async () => ({
    dtos: [],
    pendingChanges: new Map(),
    localStates: new Map(),
  })),
  executeActionsWithTracking: vi.fn(async () => ({
    receipts: [],
    completedFileIds: [],
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

vi.mock('../../apply-journal.js', () => ({
  createApplyJournal: vi.fn(async () => undefined),
  updateApplyJournal: vi.fn(async () => undefined),
}));

vi.mock('../../recovery-coordinator.js', () => ({
  recoverPendingApply: vi.fn(async () => false),
}));

vi.mock('../scheduler.js', () => ({
  scheduleSync: vi.fn(),
  cancelScheduledSync: vi.fn(),
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

const { getActiveVaultInfoMock } = vi.hoisted(() => ({
  getActiveVaultInfoMock: vi.fn(async () => null),
}));

vi.mock('../../../vault/index.js', () => ({
  getActiveVaultInfo: getActiveVaultInfoMock,
}));

vi.mock('../../file-index/index.js', () => ({
  fileIndexManager: {
    load: vi.fn(async () => undefined),
    scanAndCreateIds: vi.fn(async () => 0),
    clearCache: vi.fn(),
    getOrCreate: vi.fn(async () => 'file-new'),
    delete: vi.fn(async () => null),
    move: vi.fn(async () => undefined),
  },
}));

import { cloudSyncEngine } from '../index';
import { syncState } from '../state';
import { fileIndexManager } from '../../file-index/index.js';
import { cloudSyncApi } from '../../api/client.js';
import { executeActionsWithTracking } from '../executor.js';
import { activityTracker } from '../activity-tracker.js';
import { recoverPendingApply } from '../../recovery-coordinator.js';
import * as scheduler from '../scheduler.js';
import { getActiveVaultInfo } from '../../../vault/index.js';

describe('cloudSyncEngine triggerSync offline behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(recoverPendingApply).mockResolvedValue(false);
    vi.mocked(getActiveVaultInfo).mockResolvedValue(null);
    readBindingMock.mockReturnValue(null);
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

  it('reinit restores active vault when sync state no longer keeps vaultPath', async () => {
    syncState.reset();
    vi.mocked(getActiveVaultInfo).mockResolvedValue({
      id: 'vault-1',
      path: '/vault',
      name: 'workspace',
      addedAt: Date.now(),
    });
    readBindingMock.mockReturnValue({
      localPath: '/vault',
      vaultId: 'vault-1',
      vaultName: 'workspace',
      boundAt: Date.now(),
      userId: 'user-1',
    });

    await cloudSyncEngine.reinit();

    await vi.waitFor(() => {
      expect(syncDiffMock).toHaveBeenCalled();
    });
    expect(syncState.getSnapshot().vaultPath).toBe('/vault');
    expect(syncState.getSnapshot().vaultId).toBe('vault-1');
  });

  it('registers fileId for newly added markdown file before scheduling sync', async () => {
    syncState.setVault('/vault', 'vault-1');
    syncState.setStatus('idle');

    cloudSyncEngine.handleFileChange('add', '/vault/notes/new.md');

    await vi.waitFor(() => {
      expect(fileIndexManager.getOrCreate).toHaveBeenCalledWith('/vault', 'notes/new.md');
    });
    expect(vi.mocked(scheduler.scheduleSync)).toHaveBeenCalled();
  });

  it('does not end sync activity when nothing needs syncing', async () => {
    syncDiffMock.mockResolvedValue({ actions: [] });
    syncState.setStatus('idle');

    cloudSyncEngine.triggerSync();

    await vi.waitFor(() => {
      expect(syncDiffMock).toHaveBeenCalled();
    });

    expect(activityTracker.startSync).not.toHaveBeenCalled();
    expect(activityTracker.endSync).not.toHaveBeenCalled();
    expect(syncState.getSnapshot().engineStatus).toBe('idle');
  });

  it('ends sync activity when execute phase returns errors', async () => {
    syncDiffMock.mockResolvedValue({ actions: [{ actionId: 'action-1' }] });
    syncState.setStatus('idle');
    vi.mocked(executeActionsWithTracking).mockResolvedValueOnce({
      receipts: [],
      completedFileIds: [],
      deleted: [],
      downloadedEntries: [],
      conflictEntries: [],
      stagedOperations: [],
      uploadedObjects: [],
      errors: [new Error('upload failed')],
    });

    cloudSyncEngine.triggerSync();

    await vi.waitFor(() => {
      expect(activityTracker.endSync).toHaveBeenCalledTimes(1);
    });
    expect(syncState.getSnapshot().engineStatus).toBe('needs_recovery');
  });

  it('ends sync activity when commit reports conflicts', async () => {
    syncDiffMock.mockResolvedValue({ actions: [{ actionId: 'action-1' }] });
    syncState.setStatus('idle');
    vi.mocked(executeActionsWithTracking).mockResolvedValueOnce({
      receipts: [{ actionId: 'action-1', receiptToken: 'receipt-1' }],
      completedFileIds: [],
      deleted: [],
      downloadedEntries: [],
      conflictEntries: [],
      stagedOperations: [],
      uploadedObjects: [],
      errors: [],
    });
    vi.mocked(cloudSyncApi.syncCommit).mockResolvedValueOnce({
      success: false,
      syncedAt: new Date(),
      conflicts: [
        {
          fileId: 'file-1',
          path: 'note.md',
          expectedHash: 'hash-old',
          currentHash: 'hash-new',
        },
      ],
    });

    cloudSyncEngine.triggerSync();

    await vi.waitFor(() => {
      expect(activityTracker.endSync).toHaveBeenCalledTimes(1);
    });
    expect(syncState.getSnapshot().engineStatus).toBe('needs_recovery');
  });

  it('treats non-success commit without conflicts as recovery-required', async () => {
    syncDiffMock.mockResolvedValue({ actions: [{ actionId: 'action-1' }] });
    syncState.setStatus('idle');
    vi.mocked(executeActionsWithTracking).mockResolvedValueOnce({
      receipts: [{ actionId: 'action-1', receiptToken: 'receipt-1' }],
      completedFileIds: [],
      deleted: [],
      downloadedEntries: [],
      conflictEntries: [],
      stagedOperations: [],
      uploadedObjects: [],
      errors: [],
    });
    vi.mocked(cloudSyncApi.syncCommit).mockResolvedValueOnce({
      success: false,
      syncedAt: new Date(),
    });

    cloudSyncEngine.triggerSync();

    await vi.waitFor(() => {
      expect(syncState.getSnapshot().engineStatus).toBe('needs_recovery');
    });
    expect(syncState.getSnapshot().lastSyncAt).toBeNull();
    expect(activityTracker.clearPending).not.toHaveBeenCalled();
  });

  it('stores conflict copy notice after a successful sync with conflicts', async () => {
    syncDiffMock.mockResolvedValue({ actions: [{ actionId: 'action-1' }] });
    syncState.setStatus('idle');
    vi.mocked(executeActionsWithTracking).mockResolvedValueOnce({
      receipts: [{ actionId: 'action-1', receiptToken: 'receipt-1' }],
      completedFileIds: [],
      deleted: [],
      downloadedEntries: [],
      conflictEntries: [
        {
          originalFileId: 'file-1',
          originalPath: 'note.md',
          mergedClock: {},
          contentHash: 'hash-1',
          originalSize: 10,
          originalMtime: 11,
          conflictCopyId: 'file-2',
          conflictCopyPath: 'note (conflict).md',
          conflictCopyClock: {},
          conflictCopyHash: 'hash-2',
          conflictCopySize: 12,
          conflictCopyMtime: 13,
        },
      ],
      stagedOperations: [],
      uploadedObjects: [],
      errors: [],
    });

    cloudSyncEngine.triggerSync();

    await vi.waitFor(() => {
      expect(syncState.getSnapshot().engineStatus).toBe('idle');
      expect(syncState.getSnapshot().notice).toEqual({
        kind: 'conflict_copy_created',
        createdAt: expect.any(Number),
        items: [
          {
            fileId: 'file-2',
            path: 'note (conflict).md',
          },
        ],
      });
    });
  });

  it('clears stale conflict notice after the next clean successful sync', async () => {
    syncState.setNotice({
      kind: 'conflict_copy_created',
      createdAt: 1,
      items: [{ fileId: 'file-2', path: 'note (conflict).md' }],
    });
    syncDiffMock.mockResolvedValue({ actions: [{ actionId: 'action-1' }] });
    syncState.setStatus('idle');
    vi.mocked(executeActionsWithTracking).mockResolvedValueOnce({
      receipts: [{ actionId: 'action-1', receiptToken: 'receipt-1' }],
      completedFileIds: [],
      deleted: [],
      downloadedEntries: [],
      conflictEntries: [],
      stagedOperations: [],
      uploadedObjects: [],
      errors: [],
    });

    cloudSyncEngine.triggerSync();

    await vi.waitFor(() => {
      expect(syncState.getSnapshot().engineStatus).toBe('idle');
      expect(syncState.getSnapshot().notice).toBeUndefined();
    });
  });

  it('clears stale conflict notice after a no-op successful sync', async () => {
    syncState.setNotice({
      kind: 'conflict_copy_created',
      createdAt: 1,
      items: [{ fileId: 'file-2', path: 'note (conflict).md' }],
    });
    syncDiffMock.mockResolvedValue({ actions: [] });
    syncState.setStatus('idle');

    cloudSyncEngine.triggerSync();

    await vi.waitFor(() => {
      expect(syncState.getSnapshot().engineStatus).toBe('idle');
      expect(syncState.getSnapshot().notice).toBeUndefined();
    });
  });
});
