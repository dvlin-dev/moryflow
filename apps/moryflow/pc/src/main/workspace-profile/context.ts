import path from 'node:path';
import { membershipBridge } from '../membership-bridge.js';
import { fetchCurrentUserId } from '../cloud-sync/user-info.js';
import { getActiveVaultInfo } from '../vault/index.js';
import {
  ensureWorkspaceIdentity,
  type WorkspaceIdentity,
} from '../workspace-meta/identity.js';
import {
  workspaceProfileApi,
  type WorkspaceResolveInput,
  type WorkspaceResolveResult,
} from './api/client.js';
import {
  buildWorkspaceProfileKey,
  workspaceProfileService,
  type WorkspaceProfileStoreLike,
} from './service.js';
import type { WorkspaceProfileRecord } from './const.js';

export interface WorkspaceProfileContextResult {
  loggedIn: boolean;
  activeVault: {
    id: string;
    name: string;
    path: string;
    addedAt: number;
  } | null;
  userId: string | null;
  identity: WorkspaceIdentity | null;
  profileKey: string | null;
  profile: WorkspaceProfileRecord | null;
}

interface WorkspaceProfileContextDeps {
  membership: {
    getConfig: () => {
      token: string | null;
    };
  };
  vault: {
    getActiveVaultInfo: () => Promise<WorkspaceProfileContextResult['activeVault']>;
  };
  user: {
    fetchCurrentUserId: () => Promise<string | null>;
  };
  workspaceMeta: {
    ensureWorkspaceIdentity: (workspacePath: string) => Promise<WorkspaceIdentity>;
  };
  profileService: Pick<
    typeof workspaceProfileService,
    'getProfile' | 'saveProfile'
  >;
  api: {
    resolveWorkspace: (
      input: WorkspaceResolveInput,
    ) => Promise<WorkspaceResolveResult>;
  };
}

const defaultDeps: WorkspaceProfileContextDeps = {
  membership: membershipBridge,
  vault: {
    getActiveVaultInfo,
  },
  user: {
    fetchCurrentUserId,
  },
  workspaceMeta: {
    ensureWorkspaceIdentity,
  },
  profileService: workspaceProfileService,
  api: workspaceProfileApi,
};

const toProfileRecord = (
  result: WorkspaceResolveResult,
): WorkspaceProfileRecord => ({
  workspaceId: result.workspaceId,
  memoryProjectId: result.memoryProjectId,
  syncVaultId: result.syncVaultId,
  syncEnabled: result.syncEnabled,
  lastResolvedAt: new Date().toISOString(),
});

export async function resolveActiveWorkspaceProfileContext(
  input: {
    syncRequested?: boolean;
    forceRemote?: boolean;
  } = {},
  deps: WorkspaceProfileContextDeps = defaultDeps,
): Promise<WorkspaceProfileContextResult> {
  const activeVault = await deps.vault.getActiveVaultInfo();
  return resolveWorkspaceProfileContextForWorkspace(
    activeVault,
    input,
    deps,
  );
}

export async function resolveWorkspaceProfileContextForWorkspace(
  workspace: WorkspaceProfileContextResult['activeVault'],
  input: {
    syncRequested?: boolean;
    forceRemote?: boolean;
  } = {},
  deps: WorkspaceProfileContextDeps = defaultDeps,
): Promise<WorkspaceProfileContextResult> {
  const loggedIn = Boolean(deps.membership.getConfig().token);

  if (!workspace?.path) {
    return {
      loggedIn,
      activeVault: null,
      userId: null,
      identity: null,
      profileKey: null,
      profile: null,
    };
  }

  const identity = await deps.workspaceMeta.ensureWorkspaceIdentity(workspace.path);

  if (!loggedIn) {
    return {
      loggedIn: false,
      activeVault: workspace,
      userId: null,
      identity,
      profileKey: null,
      profile: null,
    };
  }

  const userId = await deps.user.fetchCurrentUserId();
  if (!userId) {
    return {
      loggedIn: false,
      activeVault: workspace,
      userId: null,
      identity,
      profileKey: null,
      profile: null,
    };
  }

  const profileKey = buildWorkspaceProfileKey(userId, identity.clientWorkspaceId);
  const existing = deps.profileService.getProfile(userId, identity.clientWorkspaceId);
  const needsSyncResolve =
    input.syncRequested === true &&
    (!existing?.syncEnabled || !existing.syncVaultId);
  const shouldResolveRemote = input.forceRemote === true || !existing || needsSyncResolve;

  if (!shouldResolveRemote) {
    return {
      loggedIn: true,
      activeVault: workspace,
      userId,
      identity,
      profileKey,
      profile: existing,
    };
  }

  const resolved = await deps.api.resolveWorkspace({
    clientWorkspaceId: identity.clientWorkspaceId,
    name: workspace.name.trim().length > 0 ? workspace.name : path.basename(workspace.path),
    syncRequested: input.syncRequested ?? existing?.syncEnabled ?? false,
  });
  const profile = toProfileRecord(resolved);
  deps.profileService.saveProfile(userId, identity.clientWorkspaceId, profile);

  return {
    loggedIn: true,
    activeVault: workspace,
    userId,
    identity,
    profileKey,
    profile,
  };
}
