import type { WorkspaceProfileRecord } from './const.js';
import {
  deleteWorkspaceProfile,
  readWorkspaceProfile,
  writeWorkspaceProfile,
} from './store.js';

export interface WorkspaceProfileStoreLike {
  get(key: string): WorkspaceProfileRecord | null;
  set(key: string, value: WorkspaceProfileRecord): void;
  delete(key: string): void;
}

const desktopWorkspaceProfileStore: WorkspaceProfileStoreLike = {
  get: readWorkspaceProfile,
  set: writeWorkspaceProfile,
  delete: deleteWorkspaceProfile,
};

export const buildWorkspaceProfileKey = (
  userId: string,
  clientWorkspaceId: string,
): string => `${userId}:${clientWorkspaceId}`;

export const createWorkspaceProfileService = (
  store: WorkspaceProfileStoreLike = desktopWorkspaceProfileStore,
) => ({
  getProfile(
    userId: string,
    clientWorkspaceId: string,
  ): WorkspaceProfileRecord | null {
    return store.get(buildWorkspaceProfileKey(userId, clientWorkspaceId));
  },
  saveProfile(
    userId: string,
    clientWorkspaceId: string,
    profile: WorkspaceProfileRecord,
  ): WorkspaceProfileRecord {
    store.set(buildWorkspaceProfileKey(userId, clientWorkspaceId), profile);
    return profile;
  },
  deleteProfile(userId: string, clientWorkspaceId: string): void {
    store.delete(buildWorkspaceProfileKey(userId, clientWorkspaceId));
  },
});

export const workspaceProfileService = createWorkspaceProfileService();
