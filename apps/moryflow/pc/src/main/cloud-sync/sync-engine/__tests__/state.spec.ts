/* @vitest-environment node */
import { describe, expect, it, vi } from 'vitest';
import { SyncStateManager } from '../state';

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

describe('SyncStateManager', () => {
  it('preserves offline user reason and clears it when leaving offline', () => {
    const state = new SyncStateManager();

    state.setStatus('offline', 'user');
    expect(state.getStatusReason()).toBe('user');

    state.setStatus('offline');
    expect(state.getStatusReason()).toBe('user');

    state.setStatus('idle');
    expect(state.getStatusReason()).toBeNull();
  });

  it('defaults offline reason to error when reason is omitted', () => {
    const state = new SyncStateManager();
    state.setStatus('offline');
    expect(state.getStatusReason()).toBe('error');
  });

  it('reset clears lastSyncAt and offline reason', () => {
    const state = new SyncStateManager();
    state.setStatus('offline', 'error');
    state.setLastSync(Date.now());
    state.addPending('a.md');

    state.reset();

    const snapshot = state.getSnapshot();
    expect(snapshot.engineStatus).toBe('disabled');
    expect(snapshot.pendingCount).toBe(0);
    expect(snapshot.lastSyncAt).toBeNull();
    expect(state.getStatusReason()).toBeNull();
  });
});
