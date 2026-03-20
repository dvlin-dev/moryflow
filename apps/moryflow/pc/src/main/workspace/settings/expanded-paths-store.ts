import { workspaceStore } from './store.js';

export const getExpandedPaths = (vaultPath: string): string[] => {
  const bucket = workspaceStore.get('expandedPaths');
  if (!bucket || typeof bucket !== 'object') {
    return [];
  }
  return bucket[vaultPath] ?? [];
};

export const setExpandedPaths = (vaultPath: string, paths: string[]) => {
  const bucket = workspaceStore.get('expandedPaths');
  const next = { ...(bucket ?? {}), [vaultPath]: paths };
  workspaceStore.set('expandedPaths', next);
};
