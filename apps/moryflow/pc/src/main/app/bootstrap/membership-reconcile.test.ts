import { describe, expect, it, vi } from 'vitest';

import { createMembershipReconcileController } from './membership-reconcile.js';

describe('createMembershipReconcileController', () => {
  it('primes the current signed-in session before serializing later membership changes', async () => {
    let listener: (() => void) | null = null;
    let currentToken = 'token-1';
    let resolveSecond: (() => void) | null = null;
    const reconcileActiveWorkspaceRuntimeAfterMembershipChange = vi.fn(async () => undefined);
    const reconcileMembershipRuntimeState = vi
      .fn()
      .mockResolvedValueOnce({
        lastToken: 'token-1',
        lastUserId: 'user-1',
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = () => {
              resolve({
                lastToken: 'token-2',
                lastUserId: 'user-2',
              });
            };
          })
      )
      .mockResolvedValueOnce({
        lastToken: 'token-3',
        lastUserId: 'user-3',
      });

    const controller = createMembershipReconcileController({
      membershipBridge: {
        getConfig: () => ({ token: currentToken }),
        addListener: (next: () => void) => {
          listener = next;
        },
      },
      clearUserIdCache: vi.fn(),
      fetchCurrentUserId: vi.fn(async () => null),
      resetWorkspaceScopedRuntimeState: vi.fn(async () => undefined),
      reconcileActiveWorkspaceRuntimeAfterMembershipChange,
      reconcileMembershipRuntimeState,
      onError: vi.fn(),
    });

    controller.attach();
    await Promise.resolve();

    expect(reconcileMembershipRuntimeState).toHaveBeenCalledTimes(1);
    expect(reconcileMembershipRuntimeState).toHaveBeenCalledWith(
      {
        lastToken: 'token-1',
        lastUserId: null,
        nextToken: 'token-1',
      },
      expect.objectContaining({
        reconcileActiveWorkspaceRuntimeAfterMembershipChange,
      })
    );

    currentToken = 'token-2';
    listener?.();
    currentToken = 'token-3';
    listener?.();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(reconcileMembershipRuntimeState).toHaveBeenCalledTimes(2);
    expect(reconcileMembershipRuntimeState).toHaveBeenLastCalledWith(
      {
        lastToken: 'token-1',
        lastUserId: 'user-1',
        nextToken: 'token-2',
      },
      expect.objectContaining({
        reconcileActiveWorkspaceRuntimeAfterMembershipChange,
      })
    );

    resolveSecond?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();

    expect(reconcileMembershipRuntimeState).toHaveBeenCalledTimes(3);
    expect(reconcileMembershipRuntimeState).toHaveBeenLastCalledWith(
      {
        lastToken: 'token-2',
        lastUserId: 'user-2',
        nextToken: 'token-3',
      },
      expect.objectContaining({
        reconcileActiveWorkspaceRuntimeAfterMembershipChange,
      })
    );
  });
});
