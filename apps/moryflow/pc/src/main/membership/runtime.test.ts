import { describe, expect, it, vi } from 'vitest';
import { reconcileMembershipRuntimeState } from './runtime.js';

describe('reconcileMembershipRuntimeState', () => {
  it('resets before invoking the unified active workspace bootstrap on identity changes', async () => {
    const events: string[] = [];
    const reconcileActiveWorkspaceRuntimeAfterMembershipChange = vi.fn(async () => undefined);

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
        reconcileActiveWorkspaceRuntimeAfterMembershipChange,
      }
    );

    expect(events).toEqual(['clear', 'reset:start', 'reset:end']);
    expect(reconcileActiveWorkspaceRuntimeAfterMembershipChange).toHaveBeenCalledWith({
      identityChanged: true,
    });
    expect(result).toEqual({
      lastToken: 'token-b',
      lastUserId: 'user-b',
    });
  });

  it('keeps the minimal unchanged-identity recovery path', async () => {
    const reconcileActiveWorkspaceRuntimeAfterMembershipChange = vi.fn(async () => undefined);

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
        reconcileActiveWorkspaceRuntimeAfterMembershipChange,
      }
    );

    expect(reconcileActiveWorkspaceRuntimeAfterMembershipChange).toHaveBeenCalledWith({
      identityChanged: false,
    });
    expect(result).toEqual({
      lastToken: 'token-b',
      lastUserId: 'user-a',
    });
  });

  it('falls back to the full bootstrap path when the first resolved user id differs from an unknown previous identity', async () => {
    const resetWorkspaceScopedRuntimeState = vi.fn(async () => undefined);
    const reconcileActiveWorkspaceRuntimeAfterMembershipChange = vi.fn(async () => undefined);

    const result = await reconcileMembershipRuntimeState(
      {
        lastToken: 'token-a',
        lastUserId: null,
        nextToken: 'token-b',
      },
      {
        clearUserIdCache: vi.fn(),
        fetchCurrentUserId: async () => 'user-b',
        resetWorkspaceScopedRuntimeState,
        reconcileActiveWorkspaceRuntimeAfterMembershipChange,
      }
    );

    expect(resetWorkspaceScopedRuntimeState).toHaveBeenCalledTimes(1);
    expect(reconcileActiveWorkspaceRuntimeAfterMembershipChange).toHaveBeenCalledWith({
      identityChanged: true,
    });
    expect(result).toEqual({
      lastToken: 'token-b',
      lastUserId: 'user-b',
    });
  });

  it('does not reinit after logout and clears runtime state instead', async () => {
    const resetWorkspaceScopedRuntimeState = vi.fn(async () => undefined);
    const reconcileActiveWorkspaceRuntimeAfterMembershipChange = vi.fn(async () => undefined);

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
        reconcileActiveWorkspaceRuntimeAfterMembershipChange,
      }
    );

    expect(resetWorkspaceScopedRuntimeState).toHaveBeenCalledTimes(1);
    expect(reconcileActiveWorkspaceRuntimeAfterMembershipChange).not.toHaveBeenCalled();
    expect(result).toEqual({
      lastToken: null,
      lastUserId: null,
    });
  });
});
