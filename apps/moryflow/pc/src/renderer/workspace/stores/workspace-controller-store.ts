/**
 * [PROVIDES]: workspace-controller-store（Workspace 业务控制器快照 store）
 * [DEPENDS]: zustand (vanilla)
 * [POS]: 替代 workspace controller contexts，统一通过 store selector 读取导航/文档/树/命令/弹窗控制器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type {
  DesktopWorkspaceCommandController,
  DesktopWorkspaceDialogController,
  DesktopWorkspaceDocController,
  DesktopWorkspaceNavigationController,
  DesktopWorkspaceTreeController,
  DesktopWorkspaceVaultController,
} from '../const';

export type WorkspaceControllerSnapshot = {
  nav: DesktopWorkspaceNavigationController;
  vault: DesktopWorkspaceVaultController;
  tree: DesktopWorkspaceTreeController;
  doc: DesktopWorkspaceDocController;
  command: DesktopWorkspaceCommandController;
  dialog: DesktopWorkspaceDialogController;
};

type WorkspaceControllerStoreState = WorkspaceControllerSnapshot & {
  ready: boolean;
  setSnapshot: (snapshot: WorkspaceControllerSnapshot) => void;
  reset: () => void;
};

const noop = () => {};
const noopAsync = async () => {};
const noopSelectDirectory = async () => null;
const noopRename = async () => ({ path: '', name: '' });

const EMPTY_SNAPSHOT: WorkspaceControllerSnapshot = {
  nav: {
    destination: 'agent',
    agentSub: 'chat',
    go: noop,
    setSub: noop,
  },
  vault: {
    vault: null,
    vaultMessage: null,
    isPickingVault: false,
    openVault: noopAsync,
    selectDirectory: noopSelectDirectory,
    createVault: noopAsync,
  },
  tree: {
    tree: [],
    expandedPaths: [],
    treeState: 'idle',
    treeError: null,
    selectedEntry: null,
    refreshTree: noop,
    selectTreeNode: noop,
    setExpandedPaths: noop,
    openFileFromTree: noop,
    renameTreeNode: noop,
    deleteTreeNode: noop,
    createFileInTree: noop,
    showInFinder: noop,
    moveTreeNode: noop,
    createFileInRoot: noop,
    createFolderInRoot: noop,
  },
  doc: {
    selectedFile: null,
    activeDoc: null,
    openTabs: [],
    docState: 'idle',
    docError: null,
    saveState: 'idle',
    selectTab: noop,
    closeTab: noop,
    editorChange: noop,
    retryLoad: noop,
    renameByTitle: noopRename,
  },
  command: {
    commandOpen: false,
    setCommandOpen: noop,
    commandActions: [],
    openCommandPalette: noop,
  },
  dialog: {
    inputDialogState: {
      open: false,
      title: '',
      resolve: null,
    },
    confirmInputDialog: noop,
    cancelInputDialog: noop,
  },
};

const workspaceControllerStore = createStore<WorkspaceControllerStoreState>((set) => ({
  ...EMPTY_SNAPSHOT,
  ready: false,
  setSnapshot: (snapshot) => set({ ...snapshot, ready: true }),
  reset: () => set({ ...EMPTY_SNAPSHOT, ready: false }),
}));

const shouldSyncSnapshot = (
  current: WorkspaceControllerStoreState,
  snapshot: WorkspaceControllerSnapshot
) =>
  !current.ready ||
  current.nav !== snapshot.nav ||
  current.vault !== snapshot.vault ||
  current.tree !== snapshot.tree ||
  current.doc !== snapshot.doc ||
  current.command !== snapshot.command ||
  current.dialog !== snapshot.dialog;

export const syncWorkspaceControllerStore = (snapshot: WorkspaceControllerSnapshot) => {
  const state = workspaceControllerStore.getState();
  if (!shouldSyncSnapshot(state, snapshot)) {
    return;
  }
  state.setSnapshot(snapshot);
};

export const resetWorkspaceControllerStore = () => {
  workspaceControllerStore.getState().reset();
};

export const useWorkspaceControllerStore = <T>(
  selector: (state: WorkspaceControllerStoreState) => T
): T => useStore(workspaceControllerStore, selector);
