/**
 * [PROVIDES]: resolveMemoryAccess - session-bound access resolver for memory/knowledge tools
 * [DEPENDS]: workspace profile context, memory scope resolver
 * [POS]: PC Agent Runtime memory access gating
 */

import { type MemoryScopeDeps, resolveSessionMemoryScope } from './memory-scope.js';

type DisabledMemoryAccessState = 'login_required' | 'workspace_unavailable' | 'scope_unavailable';

export type MemoryAccess =
  | {
      state: 'enabled';
      workspaceId: string;
      vaultPath: string | null;
      profileKey: string;
    }
  | {
      state: DisabledMemoryAccessState;
      workspaceId: null;
      vaultPath: null;
      profileKey: string | null;
    };

export type MemoryAccessDeps = {
  getActiveContext: () => Promise<{
    loggedIn: boolean;
    activeVault: {
      id: string;
      name: string;
      path: string;
      addedAt: number;
    } | null;
    profile: {
      workspaceId: string;
      memoryProjectId: string;
      syncVaultId: string | null;
      syncEnabled: boolean;
      lastResolvedAt: string;
    } | null;
  }>;
} & MemoryScopeDeps;

const buildDisabledAccess = (
  state: DisabledMemoryAccessState,
  profileKey: string | null
): MemoryAccess => ({
  state,
  workspaceId: null,
  vaultPath: null,
  profileKey,
});

export const resolveMemoryAccess = async (
  deps: MemoryAccessDeps,
  chatId?: string
): Promise<MemoryAccess> => {
  const context = await deps.getActiveContext();
  const activeVaultPath = context.activeVault?.path?.trim() || null;

  if (!context.loggedIn) {
    return buildDisabledAccess('login_required', null);
  }

  if (!activeVaultPath) {
    return buildDisabledAccess('workspace_unavailable', null);
  }

  const sessionScope = resolveSessionMemoryScope(deps, chatId);
  if (sessionScope.state === 'resolved') {
    return {
      state: 'enabled',
      workspaceId: sessionScope.profile.workspaceId,
      vaultPath: sessionScope.vaultPath,
      profileKey: sessionScope.profileKey,
    };
  }

  return buildDisabledAccess('scope_unavailable', sessionScope.profileKey);
};
