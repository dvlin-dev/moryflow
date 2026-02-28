/**
 * [PROVIDES]: WorkspaceControllerProvider + useWorkspace* hooks（store-first）
 * [DEPENDS]: useDesktopWorkspace, useNavigation, workspace-controller-store
 * [POS]: 解决 DesktopWorkspace 巨型 props 透传：Provider 只负责单例 controller 快照同步，子组件统一 store selector 就地取值
 * [UPDATE]: 2026-02-26 - store 快照同步改为 useLayoutEffect，移除 render-phase 外部写入
 */

import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigation } from '../hooks/use-navigation';
import { useDesktopWorkspace } from '../handle';
import {
  resetWorkspaceControllerStore,
  syncWorkspaceControllerStore,
  useWorkspaceControllerStore,
} from '../stores/workspace-controller-store';
import type {
  DesktopWorkspaceController,
  DesktopWorkspaceDialogController,
  DesktopWorkspaceNavigationController,
  DesktopWorkspaceVaultController,
  DesktopWorkspaceTreeController,
  DesktopWorkspaceDocController,
  DesktopWorkspaceCommandController,
} from '../const';

export type WorkspaceControllerProviderProps = {
  children: ReactNode;
};

const createNavigationController = (
  navigationState: ReturnType<typeof useNavigation>
): DesktopWorkspaceNavigationController => ({
  destination: navigationState.destination,
  sidebarMode: navigationState.sidebarMode,
  go: navigationState.go,
  setSidebarMode: navigationState.setSidebarMode,
});

const createVaultController = (
  controller: DesktopWorkspaceController
): DesktopWorkspaceVaultController => ({
  vault: controller.vault,
  vaultMessage: controller.vaultMessage,
  isPickingVault: controller.isPickingVault,
  openVault: controller.onVaultOpen,
  selectDirectory: controller.onSelectDirectory,
  createVault: controller.onVaultCreate,
});

const createTreeController = (
  controller: DesktopWorkspaceController
): DesktopWorkspaceTreeController => ({
  tree: controller.tree,
  expandedPaths: controller.expandedPaths,
  treeState: controller.treeState,
  treeError: controller.treeError,
  selectedEntry: controller.selectedEntry,
  refreshTree: controller.onRefreshTree,
  selectTreeNode: controller.onSelectTreeNode,
  setExpandedPaths: controller.onExpandedPathsChange,
  openFileFromTree: controller.onOpenFile,
  renameTreeNode: controller.onTreeNodeRename,
  deleteTreeNode: controller.onTreeNodeDelete,
  createFileInTree: controller.onTreeNodeCreateFile,
  showInFinder: controller.onTreeNodeShowInFinder,
  moveTreeNode: controller.onTreeNodeMove,
  createFileInRoot: controller.onCreateFileInRoot,
  createFolderInRoot: controller.onCreateFolderInRoot,
});

const createDocController = (
  controller: DesktopWorkspaceController
): DesktopWorkspaceDocController => ({
  selectedFile: controller.selectedFile,
  activeDoc: controller.activeDoc,
  openTabs: controller.openTabs,
  docState: controller.docState,
  docError: controller.docError,
  saveState: controller.saveState,
  selectTab: controller.onSelectTab,
  closeTab: controller.onCloseTab,
  editorChange: controller.onEditorChange,
  retryLoad: controller.onRetryLoad,
  renameByTitle: controller.onRenameByTitle,
});

const createCommandController = (
  controller: DesktopWorkspaceController
): DesktopWorkspaceCommandController => ({
  commandOpen: controller.commandOpen,
  setCommandOpen: controller.onCommandOpenChange,
  commandActions: controller.commandActions,
  openCommandPalette: () => controller.onCommandOpenChange(true),
});

const createDialogController = (
  controller: DesktopWorkspaceController
): DesktopWorkspaceDialogController => ({
  inputDialogState: controller.inputDialogState,
  confirmInputDialog: controller.onInputDialogConfirm,
  cancelInputDialog: controller.onInputDialogCancel,
});

export const WorkspaceControllerProvider = ({ children }: WorkspaceControllerProviderProps) => {
  const [snapshotReady, setSnapshotReady] = useState(false);
  const navigationState = useNavigation();
  const controller = useDesktopWorkspace();

  const nav = useMemo(
    () => createNavigationController(navigationState),
    [
      navigationState.destination,
      navigationState.sidebarMode,
      navigationState.go,
      navigationState.setSidebarMode,
    ]
  );
  const vault = useMemo(
    () => createVaultController(controller),
    [
      controller.vault,
      controller.vaultMessage,
      controller.isPickingVault,
      controller.onVaultOpen,
      controller.onSelectDirectory,
      controller.onVaultCreate,
    ]
  );
  const tree = useMemo(
    () => createTreeController(controller),
    [
      controller.tree,
      controller.expandedPaths,
      controller.treeState,
      controller.treeError,
      controller.selectedEntry,
      controller.onRefreshTree,
      controller.onSelectTreeNode,
      controller.onExpandedPathsChange,
      controller.onOpenFile,
      controller.onTreeNodeRename,
      controller.onTreeNodeDelete,
      controller.onTreeNodeCreateFile,
      controller.onTreeNodeShowInFinder,
      controller.onTreeNodeMove,
      controller.onCreateFileInRoot,
      controller.onCreateFolderInRoot,
    ]
  );
  const doc = useMemo(
    () => createDocController(controller),
    [
      controller.selectedFile,
      controller.activeDoc,
      controller.openTabs,
      controller.docState,
      controller.docError,
      controller.saveState,
      controller.onSelectTab,
      controller.onCloseTab,
      controller.onEditorChange,
      controller.onRetryLoad,
      controller.onRenameByTitle,
    ]
  );
  const command = useMemo(
    () => createCommandController(controller),
    [controller.commandOpen, controller.onCommandOpenChange, controller.commandActions]
  );
  const dialog = useMemo(
    () => createDialogController(controller),
    [controller.inputDialogState, controller.onInputDialogConfirm, controller.onInputDialogCancel]
  );

  const snapshot = useMemo(
    () => ({
      nav,
      vault,
      tree,
      doc,
      command,
      dialog,
    }),
    [nav, vault, tree, doc, command, dialog]
  );

  useLayoutEffect(() => {
    syncWorkspaceControllerStore(snapshot);
    setSnapshotReady((prev) => prev || true);
  }, [snapshot]);

  useEffect(() => {
    return () => {
      resetWorkspaceControllerStore();
    };
  }, []);

  if (!snapshotReady) {
    return null;
  }

  return <>{children}</>;
};

const useRequiredController = <T,>(
  name: string,
  selector: (state: {
    ready: boolean;
    nav: DesktopWorkspaceNavigationController;
    vault: DesktopWorkspaceVaultController;
    tree: DesktopWorkspaceTreeController;
    doc: DesktopWorkspaceDocController;
    command: DesktopWorkspaceCommandController;
    dialog: DesktopWorkspaceDialogController;
  }) => T
): T =>
  useWorkspaceControllerStore((state) => {
    if (!state.ready) {
      throw new Error(`${name} must be used within <WorkspaceControllerProvider>`);
    }
    return selector(state);
  });

export const useWorkspaceNav = () => useRequiredController('useWorkspaceNav', (state) => state.nav);
export const useWorkspaceVault = () =>
  useRequiredController('useWorkspaceVault', (state) => state.vault);
export const useWorkspaceTree = () =>
  useRequiredController('useWorkspaceTree', (state) => state.tree);
export const useWorkspaceDoc = () => useRequiredController('useWorkspaceDoc', (state) => state.doc);
export const useWorkspaceCommand = () =>
  useRequiredController('useWorkspaceCommand', (state) => state.command);
export const useWorkspaceDialog = () =>
  useRequiredController('useWorkspaceDialog', (state) => state.dialog);
