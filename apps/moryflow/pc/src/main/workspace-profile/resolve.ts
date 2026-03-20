import path from 'node:path';
import { membershipBridge } from '../membership-bridge.js';
import { fetchCurrentUserId } from '../cloud-sync/user-info.js';
import { ensureWorkspaceIdentity } from '../workspace-meta/identity.js';
import type { WorkspaceProfileRecord } from './const.js';
import {
  buildWorkspaceProfileKey,
  workspaceProfileService,
} from './service.js';
import { workspaceProfileApi } from './api/client.js';
import { resolveWorkspaceProfileContextForWorkspace } from './context.js';

export interface ResolvedWorkspaceProfile {
  userId: string;
  clientWorkspaceId: string;
  profileKey: string;
  profile: WorkspaceProfileRecord;
}

const toWorkspaceInput = (workspacePath: string) => ({
  id: workspacePath,
  name: path.basename(workspacePath) || 'Workspace',
  path: workspacePath,
  addedAt: 0,
});

export const getStoredWorkspaceProfile = async (
  workspacePath: string,
): Promise<ResolvedWorkspaceProfile | null> => {
  const userId = await fetchCurrentUserId();
  if (!userId) {
    return null;
  }

  const identity = await ensureWorkspaceIdentity(workspacePath);
  const profile = workspaceProfileService.getProfile(
    userId,
    identity.clientWorkspaceId,
  );
  if (!profile) {
    return null;
  }

  return {
    userId,
    clientWorkspaceId: identity.clientWorkspaceId,
    profileKey: buildWorkspaceProfileKey(userId, identity.clientWorkspaceId),
    profile,
  };
};

export const resolveWorkspaceProfile = async (
  workspacePath: string,
  options: {
    syncRequested?: boolean;
    force?: boolean;
  } = {},
): Promise<ResolvedWorkspaceProfile | null> => {
  const context = await resolveWorkspaceProfileContextForWorkspace(
    toWorkspaceInput(workspacePath),
    {
      syncRequested: options.syncRequested,
      forceRemote: options.force,
    },
    {
      membership: membershipBridge,
      vault: {
        getActiveVaultInfo: async () => null,
      },
      user: {
        fetchCurrentUserId,
      },
      workspaceMeta: {
        ensureWorkspaceIdentity,
      },
      profileService: workspaceProfileService,
      api: workspaceProfileApi,
    },
  );

  if (
    !context.loggedIn ||
    !context.userId ||
    !context.identity ||
    !context.profile ||
    !context.profileKey
  ) {
    return null;
  }

  return {
    userId: context.userId,
    clientWorkspaceId: context.identity.clientWorkspaceId,
    profileKey: context.profileKey,
    profile: context.profile,
  };
};

export const updateWorkspaceProfileSyncEnabled = async (
  workspacePath: string,
  enabled: boolean,
): Promise<ResolvedWorkspaceProfile | null> => {
  const resolved = await resolveWorkspaceProfile(workspacePath, {
    syncRequested: enabled,
    force: enabled,
  });
  if (!resolved) {
    return null;
  }

  if (!enabled && resolved.profile.syncEnabled) {
    const nextProfile: WorkspaceProfileRecord = {
      ...resolved.profile,
      syncEnabled: false,
      lastResolvedAt: new Date().toISOString(),
    };
    workspaceProfileService.saveProfile(
      resolved.userId,
      resolved.clientWorkspaceId,
      nextProfile,
    );
    return {
      ...resolved,
      profile: nextProfile,
    };
  }

  return resolved;
};
