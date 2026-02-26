/**
 * [INPUT]: SyncEngine Zustand store actions/getSnapshot
 * [OUTPUT]: regression tests for no-op writes, snapshot stability, loop safety
 * [POS]: Mobile Cloud Sync store stability tests
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/auth-session', () => ({
  getAccessToken: vi.fn(() => null),
  refreshAccessToken: vi.fn(async () => false),
}));

vi.mock('@/lib/vault/file-index', () => ({
  fileIndexManager: {
    load: vi.fn(async () => undefined),
    scanAndCreateIds: vi.fn(async () => 0),
    clearCache: vi.fn(() => undefined),
  },
}));

vi.mock('@/lib/agent-runtime', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(() => undefined),
    warn: vi.fn(() => undefined),
    error: vi.fn(() => undefined),
  })),
}));

vi.mock('../api-client', () => ({
  cloudSyncApi: {
    syncDiff: vi.fn(async () => ({ actions: [] })),
    syncCommit: vi.fn(async () => ({ success: true })),
  },
  CloudSyncApiError: class CloudSyncApiError extends Error {
    isUnauthorized = false;
    isServerError = false;
  },
}));

vi.mock('../store', () => ({
  readSettings: vi.fn(async () => null),
  readBinding: vi.fn(async () => null),
  writeSettings: vi.fn(async () => undefined),
}));

vi.mock('../file-collector', () => ({
  detectLocalChanges: vi.fn(async () => ({
    dtos: [],
    pendingChanges: new Map(),
    localStates: new Map(),
  })),
}));

vi.mock('../executor', () => ({
  executeActions: vi.fn(async () => ({ errors: [], completed: [], deleted: [] })),
  applyChangesToFileIndex: vi.fn(async () => undefined),
}));

vi.mock('../auto-binding', () => ({
  tryAutoBinding: vi.fn(async () => null),
  resetAutoBindingState: vi.fn(() => undefined),
  setRetryCallback: vi.fn(() => undefined),
}));

vi.mock('../binding-conflict', () => ({
  checkAndResolveBindingConflict: vi.fn(async () => ({ hasConflict: false, choice: null })),
  resetBindingConflictState: vi.fn(() => undefined),
}));

vi.mock('../const', () => ({
  SYNC_DEBOUNCE_DELAY: 1,
  createDefaultSettings: vi.fn(() => ({
    syncEnabled: true,
    vectorizeEnabled: true,
    deviceId: 'device-1',
    deviceName: 'Device 1',
  })),
}));

import { useSyncEngineStore } from '../sync-engine';

const resetSyncEngineStore = (): void => {
  useSyncEngineStore.setState({
    status: 'disabled',
    vaultPath: null,
    vaultId: null,
    vaultName: null,
    lastSyncAt: null,
    error: null,
    pendingCount: 0,
    settings: null,
  });
};

describe('sync-engine store stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSyncEngineStore();
  });

  it('skips equivalent writes (regression: equal snapshot should not write)', () => {
    const listener = vi.fn();
    const unsubscribe = useSyncEngineStore.subscribe(listener);
    const settings = {
      syncEnabled: true,
      vectorizeEnabled: true,
      deviceId: 'device-1',
      deviceName: 'Device 1',
    };

    const state = useSyncEngineStore.getState();
    state.setStatus('disabled');
    state.setLastSync(null);
    state.setError(null);
    state.setPendingCount(0);
    state.setVault(null, null, null);

    expect(listener).toHaveBeenCalledTimes(0);

    state.setSettings(settings);
    expect(listener).toHaveBeenCalledTimes(1);

    state.setSettings({ ...settings });
    state.setStatus('disabled');
    state.setPendingCount(0);

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('returns cached snapshot reference when state is unchanged', () => {
    const first = useSyncEngineStore.getState().getSnapshot();
    const second = useSyncEngineStore.getState().getSnapshot();
    expect(second).toBe(first);

    useSyncEngineStore.getState().setStatus('syncing');

    const changed = useSyncEngineStore.getState().getSnapshot();
    const changedAgain = useSyncEngineStore.getState().getSnapshot();

    expect(changed).not.toBe(first);
    expect(changedAgain).toBe(changed);
  });

  it('prevents subscription feedback loop (regression: Maximum update depth exceeded)', () => {
    let updates = 0;

    const unsubscribe = useSyncEngineStore.subscribe((state) => {
      updates += 1;
      if (updates > 10) {
        throw new Error('unexpected feedback loop');
      }

      state.setStatus(state.status);
      state.setPendingCount(state.pendingCount);
    });

    useSyncEngineStore.getState().setStatus('syncing');

    expect(updates).toBe(1);
    unsubscribe();
  });
});
