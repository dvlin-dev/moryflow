import { workspaceStore, type SidebarMode } from './store.js';

const isValidSidebarMode = (value: unknown): value is SidebarMode =>
  value === 'chat' || value === 'home';

export const getLastSidebarMode = (): SidebarMode => {
  const stored = workspaceStore.get('lastSidebarMode');
  return isValidSidebarMode(stored) ? stored : 'home';
};

export const setLastSidebarMode = (mode: SidebarMode): void => {
  workspaceStore.set('lastSidebarMode', mode);
};
