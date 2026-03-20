import type { PersistedDocumentSession, PersistedTab } from '../../../shared/ipc.js';
import { workspaceStore } from './store.js';

const getLegacyLastOpenedFile = (vaultPath: string): string | null => {
  const bucket = workspaceStore.get('lastOpenedFile');
  if (!bucket || typeof bucket !== 'object') {
    return null;
  }
  return bucket[vaultPath] ?? null;
};

const getLegacyOpenTabs = (vaultPath: string): PersistedTab[] => {
  const bucket = workspaceStore.get('openTabs');
  if (!bucket || typeof bucket !== 'object') {
    return [];
  }
  return bucket[vaultPath] ?? [];
};

const readDocumentSessionsBucket = () => {
  const bucket = workspaceStore.get('documentSessions');
  if (!bucket || typeof bucket !== 'object') {
    return {};
  }
  return bucket;
};

export const getDocumentSession = (vaultPath: string): PersistedDocumentSession => {
  const bucket = readDocumentSessionsBucket();
  const current = bucket[vaultPath];
  if (current) {
    return {
      tabs: Array.isArray(current.tabs) ? current.tabs : [],
      activePath: typeof current.activePath === 'string' ? current.activePath : null,
    };
  }

  const migrated: PersistedDocumentSession = {
    tabs: getLegacyOpenTabs(vaultPath),
    activePath: getLegacyLastOpenedFile(vaultPath),
  };
  if (migrated.tabs.length > 0 || migrated.activePath !== null) {
    setDocumentSession(vaultPath, migrated);
  }
  return migrated;
};

export const setDocumentSession = (vaultPath: string, session: PersistedDocumentSession) => {
  const bucket = readDocumentSessionsBucket();
  const next = { ...(bucket ?? {}), [vaultPath]: session };
  workspaceStore.set('documentSessions', next);
};
