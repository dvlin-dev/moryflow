import { buildRecentFilesList } from './mru.js';
import { workspaceStore } from './store.js';

export const getRecentFiles = (vaultPath: string): string[] => {
  const bucket = workspaceStore.get('recentFiles');
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) {
    return [];
  }
  return bucket[vaultPath] ?? [];
};

export const recordRecentFile = (vaultPath: string, filePath: string | null) => {
  if (!filePath) {
    return;
  }
  const bucket = workspaceStore.get('recentFiles');
  const safeBucket = bucket && typeof bucket === 'object' && !Array.isArray(bucket) ? bucket : {};
  const current = safeBucket[vaultPath] ?? [];
  const nextList = buildRecentFilesList(current, filePath);
  const next = { ...safeBucket, [vaultPath]: nextList };
  workspaceStore.set('recentFiles', next);
};

export const removeRecentFile = (vaultPath: string, filePath: string | null) => {
  if (!filePath) {
    return;
  }
  const bucket = workspaceStore.get('recentFiles');
  const safeBucket = bucket && typeof bucket === 'object' && !Array.isArray(bucket) ? bucket : {};
  const current = safeBucket[vaultPath] ?? [];
  const nextList = current.filter((path) => path !== filePath);
  const next = { ...safeBucket, [vaultPath]: nextList };
  workspaceStore.set('recentFiles', next);
};
