import { describe, expect, it, vi } from 'vitest';
import { reconcileMembershipRuntimeState } from './runtime.js';

describe('reconcileMembershipRuntimeState', () => {
  it('awaits reset before reinit when membership identity changes', async () => {
    const events: string[] = [];
    const triggerMemoryRescan = vi.fn();

    const result = await reconcileMembershipRuntimeState(
      {
        lastToken: 'token-a',
        lastUserId: 'user-a',
        nextToken: 'token-b',
      },
      {
        clearUserIdCache: () => {
          events.push('clear');
        },
        fetchCurrentUserId: async () => 'user-b',
        resetWorkspaceScopedRuntimeState: async () => {
          events.push('reset:start');
          await Promise.resolve();
          events.push('reset:end');
        },
        reinitCloudSync: async () => {
          events.push('reinit');
        },
        triggerMemoryRescan,
      }
    );

    expect(events).toEqual(['clear', 'reset:start', 'reset:end', 'reinit']);
    expect(triggerMemoryRescan).not.toHaveBeenCalled();
    expect(result).toEqual({
      lastToken: 'token-b',
      lastUserId: 'user-b',
    });
  });

  it('triggers memory rescan after reinit when identity is unchanged', async () => {
    const triggerMemoryRescan = vi.fn();

    const result = await reconcileMembershipRuntimeState(
      {
        lastToken: 'token-a',
        lastUserId: 'user-a',
        nextToken: 'token-b',
      },
      {
        clearUserIdCache: vi.fn(),
        fetchCurrentUserId: async () => 'user-a',
        resetWorkspaceScopedRuntimeState: vi.fn(),
        reinitCloudSync: vi.fn(),
        triggerMemoryRescan,
      }
    );

    expect(triggerMemoryRescan).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      lastToken: 'token-b',
      lastUserId: 'user-a',
    });
  });

  it('does not reinit after logout and clears runtime state instead', async () => {
    const resetWorkspaceScopedRuntimeState = vi.fn(async () => undefined);
    const reinitCloudSync = vi.fn(async () => undefined);

    const result = await reconcileMembershipRuntimeState(
      {
        lastToken: 'token-a',
        lastUserId: 'user-a',
        nextToken: null,
      },
      {
        clearUserIdCache: vi.fn(),
        fetchCurrentUserId: vi.fn(),
        resetWorkspaceScopedRuntimeState,
        reinitCloudSync,
      }
    );

    expect(resetWorkspaceScopedRuntimeState).toHaveBeenCalledTimes(1);
    expect(reinitCloudSync).not.toHaveBeenCalled();
    expect(result).toEqual({
      lastToken: null,
      lastUserId: null,
    });
  });
});
