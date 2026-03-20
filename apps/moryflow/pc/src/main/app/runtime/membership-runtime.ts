export interface MembershipRuntimeStateSnapshot {
  lastToken: string | null;
  lastUserId: string | null;
  nextToken: string | null;
}

export interface MembershipRuntimeDeps {
  clearUserIdCache: () => void;
  fetchCurrentUserId: () => Promise<string | null>;
  resetWorkspaceScopedRuntimeState: () => Promise<void>;
  reinitCloudSync: () => Promise<void>;
  triggerMemoryRescan?: () => void;
}

export interface MembershipRuntimeStateResult {
  lastToken: string | null;
  lastUserId: string | null;
}

export const reconcileMembershipRuntimeState = async (
  input: MembershipRuntimeStateSnapshot,
  deps: MembershipRuntimeDeps
): Promise<MembershipRuntimeStateResult> => {
  const { lastToken, lastUserId, nextToken } = input;

  if (nextToken !== lastToken) {
    deps.clearUserIdCache();
  }

  if (!nextToken) {
    await deps.resetWorkspaceScopedRuntimeState();
    return {
      lastToken: null,
      lastUserId: null,
    };
  }

  const nextUserId = await deps.fetchCurrentUserId();

  // If userId resolution fails transiently, preserve lastUserId so the next
  // reconciliation can still detect an identity change correctly.
  const effectiveNextUserId = nextUserId ?? lastUserId;
  const membershipIdentityChanged =
    Boolean(lastUserId) && Boolean(nextUserId) && nextUserId !== lastUserId;

  if (membershipIdentityChanged) {
    await deps.resetWorkspaceScopedRuntimeState();
  }

  await deps.reinitCloudSync();

  if (!membershipIdentityChanged) {
    deps.triggerMemoryRescan?.();
  }

  return {
    lastToken: nextToken,
    lastUserId: effectiveNextUserId,
  };
};
