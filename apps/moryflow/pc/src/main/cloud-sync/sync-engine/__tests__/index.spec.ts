/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  syncDiffMock,
  syncCommitMock,
} = vi.hoisted(() => ({
  syncDiffMock: vi.fn(),
  syncCommitMock: vi.fn(async () => ({ success: true })),
}));

const { getMembershipConfigMock } = vi.hoisted(() => ({
  getMembershipConfigMock: vi.fn(() => ({
    enabled: true,
    apiUrl: 'https://server.moryflow.com',
    token: 'token-1',
  })),
}));

const { readDeviceConfigMock } = vi.hoisted(() => ({
  readDeviceConfigMock: vi.fn(() => ({
    deviceId: 'device-1',
    deviceName: 'Device 1',
  })),
}));

const {
  getStoredWorkspaceProfileMock,
} = vi.hoisted(() => ({
  getStoredWorkspaceProfileMock: vi.fn(),
}));

const { tryAutoBindingMock } = vi.hoisted(() => ({
  tryAutoBindingMock: vi.fn(async () => null),
}));

const {
  ensureFileIdMock,
  moveFileIdMock,
  removeFileIdMock,
} = vi.hoisted(() => ({
  ensureFileIdMock: vi.fn(async () => 'document-new'),
  moveFileIdMock: vi.fn(async () => undefined),
  removeFileIdMock: vi.fn(async () => undefined),
}));

const { getActiveVaultInfoMock } = vi.hoisted(() => ({
  getActiveVaultInfoMock: vi.fn(async () => null),
}));

const {
  createApplyJournalMock,
  updateApplyJournalMock,
} = vi.hoisted(() => ({
  createApplyJournalMock: vi.fn(async () => undefined),
  updateApplyJournalMock: vi.fn(async () => undefined),
}));

const { recoverPendingApplyMock } = vi.hoisted(() => ({
  recoverPendingApplyMock: vi.fn(async () => false),
}));

const {
  scheduleSyncMock,
  cancelScheduledSyncMock,
} = vi.hoisted(() => ({
  scheduleSyncMock: vi.fn(),
  cancelScheduledSyncMock: vi.fn(),
}));

const {
  loadSyncMirrorMock,
  clearSyncMirrorCacheMock,
  getAllSyncMirrorEntriesMock,
  getSyncMirrorEntryMock,
} = vi.hoisted(() => ({
  loadSyncMirrorMock: vi.fn(async () => undefined),
  clearSyncMirrorCacheMock: vi.fn(),
  getAllSyncMirrorEntriesMock: vi.fn(() => []),
  getSyncMirrorEntryMock: vi.fn(() => undefined),
}));

const {
  workspaceRegistryLoadMock,
  workspaceRegistrySyncMock,
  workspaceRegistryClearCacheMock,
  workspaceRegistryGetByPathMock,
} = vi.hoisted(() => ({
  workspaceRegistryLoadMock: vi.fn(async () => undefined),
  workspaceRegistrySyncMock: vi.fn(async () => []),
  workspaceRegistryClearCacheMock: vi.fn(),
  workspaceRegistryGetByPathMock: vi.fn(async () => null),
}));

const {
  detectLocalChangesMock,
  executeActionsWithTrackingMock,
  getRelativePathMock,
} = vi.hoisted(() => ({
  detectLocalChangesMock: vi.fn(async () => ({
    dtos: [],
    pendingChanges: new Map(),
    localStates: new Map(),
  })),
  executeActionsWithTrackingMock: vi.fn(async () => ({
    receipts: [],
    completedFileIds: [],
    deleted: [],
    downloadedEntries: [],
    conflictEntries: [],
    stagedOperations: [],
    uploadedObjects: [],
    errors: [],
  })),
  getRelativePathMock: vi.fn((vaultPath: string, filePath: string) =>
    filePath.startsWith(vaultPath) ? filePath.slice(vaultPath.length + 1) : filePath
  ),
}));

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

vi.mock('../../api/client.js', () => ({
  cloudSyncApi: {
    syncDiff: syncDiffMock,
    syncCommit: syncCommitMock,
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

vi.mock('../../apply-journal.js', () => ({
  clearApplyJournal: vi.fn(async () => undefined),
  createApplyJournal: createApplyJournalMock,
  updateApplyJournal: updateApplyJournalMock,
}));

vi.mock('../../recovery-coordinator.js', () => ({
  recoverPendingApply: recoverPendingApplyMock,
}));

vi.mock('../scheduler.js', () => ({
  scheduleSync: scheduleSyncMock,
  cancelScheduledSync: cancelScheduledSyncMock,
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
  tryAutoBinding: tryAutoBindingMock,
  resetAutoBindingState: vi.fn(),
  setRetryCallback: vi.fn(),
}));

vi.mock('../../../vault/index.js', () => ({
  getActiveVaultInfo: getActiveVaultInfoMock,
}));

vi.mock('../../../device-config/store.js', () => ({
  readDeviceConfig: readDeviceConfigMock,
}));

vi.mock('../../../workspace-profile/resolve.js', () => ({
  getStoredWorkspaceProfile: getStoredWorkspaceProfileMock,
}));

vi.mock('../../file-id-registry.js', () => ({
  ensureFileId: ensureFileIdMock,
  moveFileId: moveFileIdMock,
  removeFileId: removeFileIdMock,
}));

vi.mock('../../sync-mirror-state.js', () => ({
  loadSyncMirror: loadSyncMirrorMock,
  clearSyncMirrorCache: clearSyncMirrorCacheMock,
  getAllSyncMirrorEntries: getAllSyncMirrorEntriesMock,
  getSyncMirrorEntry: getSyncMirrorEntryMock,
}));

vi.mock('../../../workspace-doc-registry/index.js', () => ({
  workspaceDocRegistry: {
    load: workspaceRegistryLoadMock,
    sync: workspaceRegistrySyncMock,
    clearCache: workspaceRegistryClearCacheMock,
    getByPath: workspaceRegistryGetByPathMock,
  },
}));

vi.mock('../executor.js', () => ({
  detectLocalChanges: detectLocalChangesMock,
  executeActionsWithTracking: executeActionsWithTrackingMock,
  getRelativePath: getRelativePathMock,
}));

import { cloudSyncEngine } from '../index';
import { syncState } from '../state';
import { recoverPendingApply } from '../../recovery-coordinator.js';
import { createApplyJournal } from '../../apply-journal.js';
import { activityTracker } from '../activity-tracker.js';
import { getActiveVaultInfo } from '../../../vault/index.js';
import { tryAutoBinding } from '../../auto-binding.js';
import * as scheduler from '../scheduler.js';

const createResolvedProfile = (overrides?: {
  syncEnabled?: boolean;
  syncVaultId?: string | null;
  profileKey?: string;
  userId?: string;
}) => ({
  userId: overrides?.userId ?? 'user-1',
  clientWorkspaceId: 'workspace-1',
  profileKey: overrides?.profileKey ?? 'user-1:workspace-1',
  profile: {
    workspaceId: 'workspace-1',
    memoryProjectId: 'workspace-1',
    syncVaultId:
      overrides && 'syncVaultId' in overrides ? overrides.syncVaultId ?? null : 'vault-1',
    syncEnabled: overrides?.syncEnabled ?? true,
    lastResolvedAt: '2026-03-14T00:00:00.000Z',
  },
});

describe('cloudSyncEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncState.reset();
    syncDiffMock.mockResolvedValue({ actions: [] });
    getStoredWorkspaceProfileMock.mockResolvedValue(createResolvedProfile());
    getActiveVaultInfoMock.mockResolvedValue(null);
  });

  it('does not sync while offline because of user choice', async () => {
    syncState.setVault('/vault', 'vault-1');
    syncState.setProfileKey('user-1:workspace-1');
    syncState.setUserId('user-1');
    syncState.setStatus('offline', 'user');

    cloudSyncEngine.triggerSync();
    await Promise.resolve();

    expect(syncDiffMock).not.toHaveBeenCalled();
  });

  it('reinit restores active vault using the current workspace profile', async () => {
    syncState.reset();
    vi.mocked(getActiveVaultInfo).mockResolvedValue({
      id: 'local-workspace-1',
      path: '/vault',
      name: 'workspace',
      addedAt: Date.now(),
    });

    await cloudSyncEngine.reinit();

    await vi.waitFor(() => {
      expect(syncDiffMock).toHaveBeenCalled();
    });
    expect(syncState.getSnapshot().vaultPath).toBe('/vault');
    expect(syncState.getSnapshot().vaultId).toBe('vault-1');
    expect(syncState.profileKey).toBe('user-1:workspace-1');
  });

  it('uses device-config deviceId for sync and recovery', async () => {
    syncState.setVault('/vault', 'vault-1');
    syncState.setProfileKey('user-1:workspace-1');
    syncState.setUserId('user-1');
    syncState.setStatus('idle');

    cloudSyncEngine.triggerSync();

    await vi.waitFor(() => {
      expect(syncDiffMock).toHaveBeenCalledWith({
        vaultId: 'vault-1',
        deviceId: 'device-1',
        localFiles: [],
      });
    });
    expect(vi.mocked(recoverPendingApply)).toHaveBeenCalledWith({
      vaultPath: '/vault',
      profileKey: 'user-1:workspace-1',
      vaultId: 'vault-1',
      currentUserId: 'user-1',
    });
  });

  it('auto binds when sync is enabled but syncVaultId is missing', async () => {
    getStoredWorkspaceProfileMock
      .mockResolvedValueOnce(
        createResolvedProfile({
          syncVaultId: null,
        })
      )
      .mockResolvedValueOnce(
        createResolvedProfile({
          syncVaultId: 'vault-2',
        })
      );
    vi.mocked(tryAutoBinding).mockResolvedValueOnce({
      localPath: '/vault',
      vaultId: 'vault-2',
      vaultName: 'workspace',
      boundAt: Date.now(),
      userId: 'user-1',
      profileKey: 'user-1:workspace-1',
      workspaceId: 'workspace-1',
    });

    await cloudSyncEngine.init('/vault');

    expect(vi.mocked(tryAutoBinding)).toHaveBeenCalledWith('/vault');
    expect(syncState.getSnapshot().vaultId).toBe('vault-2');
    expect(syncState.profileKey).toBe('user-1:workspace-1');
  });

  it('registers document id for newly added markdown file before scheduling sync', async () => {
    syncState.setVault('/vault', 'vault-1');
    syncState.setProfileKey('user-1:workspace-1');
    syncState.setUserId('user-1');
    syncState.setStatus('idle');

    cloudSyncEngine.handleFileChange('add', '/vault/notes/new.md');

    await vi.waitFor(() => {
      expect(ensureFileIdMock).toHaveBeenCalledWith('/vault', 'notes/new.md');
    });
    expect(vi.mocked(scheduler.scheduleSync)).toHaveBeenCalled();
  });

  it('writes journal ownership with current profile key and user id', async () => {
    syncDiffMock.mockResolvedValue({ actions: [{ actionId: 'action-1' }] });
    syncState.setVault('/vault', 'vault-1');
    syncState.setProfileKey('user-1:workspace-1');
    syncState.setUserId('user-1');
    syncState.setStatus('idle');

    cloudSyncEngine.triggerSync();

    await vi.waitFor(() => {
      expect(vi.mocked(createApplyJournal)).toHaveBeenCalledWith(
        '/vault',
        'user-1:workspace-1',
        expect.objectContaining({
          vaultId: 'vault-1',
          userId: 'user-1',
        })
      );
    });
    expect(activityTracker.startSync).toHaveBeenCalledTimes(1);
  });

  it('aborts commit when the active profile drifts during the sync session', async () => {
    syncDiffMock.mockResolvedValue({
      actions: [{ actionId: 'action-1' }],
    });
    executeActionsWithTrackingMock.mockImplementationOnce(async () => {
      getStoredWorkspaceProfileMock.mockResolvedValue(
        createResolvedProfile({
          profileKey: 'user-2:workspace-1',
          userId: 'user-2',
        })
      );
      return {
        receipts: [{ actionId: 'action-1', receiptToken: 'receipt-1' }],
        completedFileIds: [],
        deleted: [],
        downloadedEntries: [],
        conflictEntries: [],
        stagedOperations: [],
        uploadedObjects: [],
        errors: [],
      };
    });
    syncState.setVault('/vault', 'vault-1');
    syncState.setProfileKey('user-1:workspace-1');
    syncState.setUserId('user-1');
    syncState.setStatus('idle');

    cloudSyncEngine.triggerSync();

    await vi.waitFor(() => {
      expect(executeActionsWithTrackingMock).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      expect(syncCommitMock).not.toHaveBeenCalled();
    });
  });
});
