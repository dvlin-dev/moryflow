import { beforeEach, describe, expect, it, vi } from 'vitest';

const { syncDiffMock } = vi.hoisted(() => ({
  syncDiffMock: vi.fn(),
}));

vi.mock('@/lib/server/auth-session', () => ({
  getAccessToken: vi.fn(() => 'token-1'),
  refreshAccessToken: vi.fn(async () => true),
}));

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'journal-1'),
}));

vi.mock('../api-client', () => ({
  cloudSyncApi: {
    syncDiff: syncDiffMock,
    syncCommit: vi.fn(async () => ({ success: true })),
  },
  CloudSyncApiError: class CloudSyncApiError extends Error {
    status = 500;
    isUnauthorized = false;
    isServerError = false;
  },
}));

vi.mock('../store', () => ({
  readSettings: vi.fn(async () => ({
    syncEnabled: true,
    deviceId: 'device-1',
    deviceName: 'Device 1',
  })),
  writeSettings: vi.fn(async () => undefined),
  readBinding: vi.fn(async () => ({
    vaultId: 'vault-1',
    vaultName: 'Vault 1',
  })),
}));

vi.mock('@/lib/vault/file-index', () => ({
  fileIndexManager: {
    load: vi.fn(async () => undefined),
    scanAndCreateIds: vi.fn(async () => 0),
    clearCache: vi.fn(),
  },
}));

vi.mock('../file-collector', () => ({
  detectLocalChanges: vi.fn(async () => ({
    dtos: [],
    pendingChanges: new Map(),
    localStates: new Map(),
  })),
}));

vi.mock('../executor', () => ({
  executeActions: vi.fn(async () => ({
    receipts: [],
    completedFileIds: [],
    deleted: [],
    downloadedEntries: [],
    conflictEntries: [],
    stagedOperations: [],
    uploadedObjects: [],
    errors: [],
  })),
  applyChangesToFileIndex: vi.fn(async () => undefined),
}));

vi.mock('../apply-journal', () => ({
  createApplyJournal: vi.fn(async () => undefined),
  updateApplyJournal: vi.fn(async () => undefined),
  readApplyJournal: vi.fn(async () => null),
}));

vi.mock('../recovery-coordinator', () => ({
  recoverPendingApply: vi.fn(async () => false),
}));

vi.mock('../scheduler', () => ({
  scheduleSync: vi.fn(),
  cancelScheduledSync: vi.fn(),
}));

vi.mock('../auto-binding', () => ({
  tryAutoBinding: vi.fn(async () => null),
  resetAutoBindingState: vi.fn(),
  setRetryCallback: vi.fn(),
}));

vi.mock('../binding-conflict', () => ({
  checkAndResolveBindingConflict: vi.fn(async () => ({ hasConflict: false })),
  resetBindingConflictState: vi.fn(),
}));

vi.mock('../const', () => ({
  createDefaultSettings: vi.fn(() => ({
    syncEnabled: true,
    deviceId: 'device-1',
    deviceName: 'Device 1',
  })),
}));

vi.mock('@/lib/agent-runtime', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { cloudSyncEngine, useSyncEngineStore } from '../sync-engine';
import { executeActions } from '../executor';
import { cloudSyncApi } from '../api-client';

describe('mobile cloudSyncEngine offline behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSyncEngineStore.setState({
      status: 'disabled',
      offlineReason: null,
      vaultPath: null,
      vaultId: null,
      vaultName: null,
      lastSyncAt: null,
      error: null,
      pendingCount: 0,
      notice: null,
      settings: {
        syncEnabled: true,
        deviceId: 'device-1',
        deviceName: 'Device 1',
      },
    });
    syncDiffMock.mockResolvedValue({ actions: [] });
  });

  it('does not sync when user chose stay_offline', async () => {
    useSyncEngineStore.getState().setVault('/vault', 'vault-1', 'Vault 1');
    useSyncEngineStore.getState().setStatus('offline', 'user');

    cloudSyncEngine.triggerSync();
    await Promise.resolve();

    expect(syncDiffMock).not.toHaveBeenCalled();
  });

  it('retries sync when offline reason is error', async () => {
    useSyncEngineStore.getState().setVault('/vault', 'vault-1', 'Vault 1');
    useSyncEngineStore.getState().setStatus('offline', 'error');

    cloudSyncEngine.triggerSync();

    await vi.waitFor(() => {
      expect(syncDiffMock).toHaveBeenCalled();
    });
  });

  it('treats non-success commit without conflicts as recovery-required', async () => {
    useSyncEngineStore.getState().setVault('/vault', 'vault-1', 'Vault 1');
    useSyncEngineStore.getState().setStatus('idle');
    syncDiffMock.mockResolvedValueOnce({ actions: [{ actionId: 'action-1' }] });

    vi.mocked(executeActions).mockResolvedValueOnce({
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
      expect(useSyncEngineStore.getState().status).toBe('needs_recovery');
    });
    expect(useSyncEngineStore.getState().lastSyncAt).toBeNull();
    expect(useSyncEngineStore.getState().pendingCount).toBe(0);
  });

  it('stores conflict copy notice after a successful sync with conflicts', async () => {
    useSyncEngineStore.getState().setVault('/vault', 'vault-1', 'Vault 1');
    useSyncEngineStore.getState().setStatus('idle');
    syncDiffMock.mockResolvedValueOnce({ actions: [{ actionId: 'action-1' }] });

    vi.mocked(executeActions).mockResolvedValueOnce({
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
      expect(useSyncEngineStore.getState().status).toBe('idle');
      expect(useSyncEngineStore.getState().notice).toEqual({
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
    useSyncEngineStore.setState({
      notice: {
        kind: 'conflict_copy_created',
        createdAt: 1,
        items: [{ fileId: 'file-2', path: 'note (conflict).md' }],
      },
    });
    useSyncEngineStore.getState().setVault('/vault', 'vault-1', 'Vault 1');
    useSyncEngineStore.getState().setStatus('idle');
    syncDiffMock.mockResolvedValueOnce({ actions: [{ actionId: 'action-1' }] });

    vi.mocked(executeActions).mockResolvedValueOnce({
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
      expect(useSyncEngineStore.getState().status).toBe('idle');
      expect(useSyncEngineStore.getState().notice).toBeNull();
    });
  });
});
