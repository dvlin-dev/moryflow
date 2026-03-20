import type { PersistedDocumentSession, PersistedTab } from '../../../shared/ipc.js';
import { createDesktopStore } from '../../storage/desktop-store.js';

export type SidebarMode = 'chat' | 'home';

type WorkspaceState = {
  expandedPaths: Record<string, string[]>;
  lastOpenedFile: Record<string, string | null>;
  openTabs: Record<string, PersistedTab[]>;
  documentSessions: Record<string, PersistedDocumentSession>;
  recentFiles: Record<string, string[]>;
  lastSidebarMode: SidebarMode;
};

export const workspaceStore = createDesktopStore<WorkspaceState>({
  name: 'workspace',
  defaults: {
    expandedPaths: {},
    lastOpenedFile: {},
    openTabs: {},
    documentSessions: {},
    recentFiles: {},
    lastSidebarMode: 'home',
  },
});
