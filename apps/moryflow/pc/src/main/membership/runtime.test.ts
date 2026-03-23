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
      bootstrapRequired: false,
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
      bootstrapRequired: false,
    });
    expect(result).toEqual({
      lastToken: 'token-b',
      lastUserId: 'user-a',
    });
  });

  it('does not rebuild the active workspace runtime until the login baseline is resolved', async () => {
    const resetWorkspaceScopedRuntimeState = vi.fn(async () => undefined);
    const reconcileActiveWorkspaceRuntimeAfterMembershipChange = vi.fn(async () => undefined);

    const result = await reconcileMembershipRuntimeState(
      {
        lastToken: 'token-a',
        lastUserId: null,
        nextToken: 'token-a',
      },
      {
        clearUserIdCache: vi.fn(),
        fetchCurrentUserId: async () => null,
        resetWorkspaceScopedRuntimeState,
        reconcileActiveWorkspaceRuntimeAfterMembershipChange,
      }
    );

    expect(resetWorkspaceScopedRuntimeState).not.toHaveBeenCalled();
    expect(reconcileActiveWorkspaceRuntimeAfterMembershipChange).not.toHaveBeenCalled();
    expect(result).toEqual({
      lastToken: 'token-a',
      lastUserId: null,
    });
  });

  it('rebuilds the active workspace runtime when login baseline is first resolved', async () => {
    const resetWorkspaceScopedRuntimeState = vi.fn(async () => undefined);
    const reconcileActiveWorkspaceRuntimeAfterMembershipChange = vi.fn(async () => undefined);

    const result = await reconcileMembershipRuntimeState(
      {
        lastToken: 'token-a',
        lastUserId: null,
        nextToken: 'token-a',
      },
      {
        clearUserIdCache: vi.fn(),
        fetchCurrentUserId: async () => 'user-a',
        resetWorkspaceScopedRuntimeState,
        reconcileActiveWorkspaceRuntimeAfterMembershipChange,
      }
    );

    expect(resetWorkspaceScopedRuntimeState).not.toHaveBeenCalled();
    expect(reconcileActiveWorkspaceRuntimeAfterMembershipChange).toHaveBeenCalledWith({
      identityChanged: false,
      bootstrapRequired: true,
    });
    expect(result).toEqual({
      lastToken: 'token-a',
      lastUserId: 'user-a',
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
