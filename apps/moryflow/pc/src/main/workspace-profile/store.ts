import { createDesktopStore } from '../store-factory.js';
import {
  WORKSPACE_PROFILE_STORE_NAME,
  type WorkspaceProfileRecord,
} from './const.js';

let store: ReturnType<typeof createDesktopStore<Record<string, WorkspaceProfileRecord>>> | null =
  null;

const getStore = () => {
  if (!store) {
    store = createDesktopStore<Record<string, WorkspaceProfileRecord>>({
      name: WORKSPACE_PROFILE_STORE_NAME,
      defaults: {},
    });
  }
  return store;
};

export const readWorkspaceProfile = (
  profileKey: string,
): WorkspaceProfileRecord | null => getStore().get(profileKey) ?? null;

export const writeWorkspaceProfile = (
  profileKey: string,
  profile: WorkspaceProfileRecord,
): void => {
  getStore().set(profileKey, profile);
};

export const deleteWorkspaceProfile = (profileKey: string): void => {
  getStore().delete(profileKey);
};
