export const createMembershipReconcileController = (input: {
  membershipBridge: {
    getConfig: () => { token?: string | null };
    addListener: (listener: () => void) => void;
  };
  clearUserIdCache: () => void;
  fetchCurrentUserId: () => Promise<string | null>;
  resetWorkspaceScopedRuntimeState: () => Promise<void>;
  reconcileActiveWorkspaceRuntimeAfterMembershipChange: (input: {
    identityChanged: boolean;
  }) => Promise<void>;
  reconcileMembershipRuntimeState: (
    state: {
      lastToken: string | null;
      lastUserId: string | null;
      nextToken: string | null;
    },
    deps: {
      clearUserIdCache: () => void;
      fetchCurrentUserId: () => Promise<string | null>;
      resetWorkspaceScopedRuntimeState: () => Promise<void>;
      reconcileActiveWorkspaceRuntimeAfterMembershipChange: (input: {
        identityChanged: boolean;
      }) => Promise<void>;
    }
  ) => Promise<{ lastToken: string | null; lastUserId: string | null }>;
  onError: (error: unknown) => void;
}) => {
  let lastToken = input.membershipBridge.getConfig().token ?? null;
  let lastUserId: string | null = null;
  let reconcileChain: Promise<void> = Promise.resolve();

  const handleChange = () => {
    const nextToken = input.membershipBridge.getConfig().token ?? null;

    reconcileChain = reconcileChain
      .then(async () => {
        const result = await input.reconcileMembershipRuntimeState(
          {
            lastToken,
            lastUserId,
            nextToken,
          },
          {
            clearUserIdCache: input.clearUserIdCache,
            fetchCurrentUserId: input.fetchCurrentUserId,
            resetWorkspaceScopedRuntimeState: input.resetWorkspaceScopedRuntimeState,
            reconcileActiveWorkspaceRuntimeAfterMembershipChange:
              input.reconcileActiveWorkspaceRuntimeAfterMembershipChange,
          }
        );
        lastToken = result.lastToken;
        lastUserId = result.lastUserId;
      })
      .catch((error) => {
        input.onError(error);
      });
  };

  return {
    attach: () => {
      input.membershipBridge.addListener(handleChange);
    },
  };
};
