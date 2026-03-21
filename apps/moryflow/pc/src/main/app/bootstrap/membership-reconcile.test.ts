import { describe, expect, it, vi } from 'vitest';

import { createMembershipReconcileController } from './membership-reconcile.js';

describe('createMembershipReconcileController', () => {
  it('serializes membership reconcile work and carries forward state', async () => {
    let listener: (() => void) | null = null;
    let currentToken = 'token-1';
    let resolveFirst: (() => void) | null = null;
    const reconcileMembershipRuntimeState = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = () => {
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
      reinitCloudSync: vi.fn(async () => undefined),
      triggerMemoryRescan: vi.fn(),
      reconcileMembershipRuntimeState,
      onError: vi.fn(),
    });

    controller.attach();

    currentToken = 'token-2';
    listener?.();
    currentToken = 'token-3';
    listener?.();
    await Promise.resolve();

    expect(reconcileMembershipRuntimeState).toHaveBeenCalledTimes(1);
    expect(reconcileMembershipRuntimeState).toHaveBeenCalledWith(
      {
        lastToken: 'token-1',
        lastUserId: null,
        nextToken: 'token-2',
      },
      expect.any(Object)
    );

    resolveFirst?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();

    expect(reconcileMembershipRuntimeState).toHaveBeenCalledTimes(2);
    expect(reconcileMembershipRuntimeState).toHaveBeenLastCalledWith(
      {
        lastToken: 'token-2',
        lastUserId: 'user-2',
        nextToken: 'token-3',
      },
      expect.any(Object)
    );
  });
});
