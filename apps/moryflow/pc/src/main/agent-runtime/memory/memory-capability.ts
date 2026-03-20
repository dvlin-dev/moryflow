/**
 * [PROVIDES]: resolveMemoryToolCapability - capability resolver for memory/knowledge tools
 * [DEPENDS]: workspace profile context, memory scope resolver
 * [POS]: PC Agent Runtime memory capability gating
 */

import { type MemoryScopeDeps, resolveSessionMemoryScope } from './memory-scope.js';

export type MemoryToolCapability = {
  state: 'enabled' | 'login_required' | 'workspace_unavailable' | 'profile_unavailable';
  canRead: boolean;
  canWrite: boolean;
  canReadKnowledgeFile: boolean;
  workspaceId: string | null;
  vaultPath: string | null;
  profileKey: string | null;
};

export type MemoryToolCapabilityDeps = {
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

const buildDisabledCapability = (
  state: MemoryToolCapability['state'],
  vaultPath: string | null,
  profileKey: string | null
): MemoryToolCapability => ({
  state,
  canRead: false,
  canWrite: false,
  canReadKnowledgeFile: false,
  workspaceId: null,
  vaultPath,
  profileKey,
});

export const resolveMemoryToolCapability = async (
  deps: MemoryToolCapabilityDeps,
  chatId?: string
): Promise<MemoryToolCapability> => {
  const context = await deps.getActiveContext();
  const activeVaultPath = context.activeVault?.path?.trim() || null;

  if (!context.loggedIn) {
    return buildDisabledCapability('login_required', null, null);
  }

  if (!activeVaultPath) {
    return buildDisabledCapability('workspace_unavailable', null, null);
  }

  const sessionScope = resolveSessionMemoryScope(deps, chatId);

  if (sessionScope.state === 'resolved') {
    return {
      state: 'enabled',
      canRead: true,
      canWrite: true,
      canReadKnowledgeFile: Boolean(sessionScope.vaultPath),
      workspaceId: sessionScope.profile.workspaceId,
      vaultPath: sessionScope.vaultPath ?? activeVaultPath,
      profileKey: sessionScope.profileKey,
    };
  }

  if (chatId) {
    return buildDisabledCapability(
      'profile_unavailable',
      sessionScope.vaultPath ?? activeVaultPath,
      sessionScope.profileKey
    );
  }

  if (context.profile?.workspaceId) {
    return {
      state: 'enabled',
      canRead: true,
      canWrite: false,
      canReadKnowledgeFile: true,
      workspaceId: context.profile.workspaceId,
      vaultPath: activeVaultPath,
      profileKey: null,
    };
  }

  return {
    state: 'profile_unavailable',
    canRead: false,
    canWrite: false,
    canReadKnowledgeFile: false,
    workspaceId: null,
    vaultPath: activeVaultPath,
    profileKey: null,
  };
};
