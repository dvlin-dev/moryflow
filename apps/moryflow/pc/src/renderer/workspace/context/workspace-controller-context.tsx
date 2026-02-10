/**
 * [PROVIDES]: WorkspaceControllerProvider - Workspace feature 的单例 Controller（hook 只调用一次）
 * [DEPENDS]: useDesktopWorkspace, useAppMode
 * [POS]: 解决 DesktopWorkspace 巨型 props 透传：Controller 在 Provider 内创建，并拆分为多个 Context 供子组件就地取值
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAppMode } from '../hooks/use-app-mode';
import { useDesktopWorkspace } from '../handle';
import type {
  DesktopWorkspaceController,
  DesktopWorkspaceDialogController,
  DesktopWorkspaceModeController,
  DesktopWorkspaceVaultController,
  DesktopWorkspaceTreeController,
  DesktopWorkspaceDocController,
  DesktopWorkspaceCommandController,
} from '../const';

const ModeContext = createContext<DesktopWorkspaceModeController | null>(null);
const VaultContext = createContext<DesktopWorkspaceVaultController | null>(null);
const TreeContext = createContext<DesktopWorkspaceTreeController | null>(null);
const DocContext = createContext<DesktopWorkspaceDocController | null>(null);
const CommandContext = createContext<DesktopWorkspaceCommandController | null>(null);
const DialogContext = createContext<DesktopWorkspaceDialogController | null>(null);

export type WorkspaceControllerProviderProps = {
  children: ReactNode;
};

const createModeController = (
  modeState: ReturnType<typeof useAppMode>
): DesktopWorkspaceModeController => ({
  mode: modeState.mode,
  setMode: modeState.setMode,
  isModeReady: modeState.isReady,
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
  const modeState = useAppMode();
  const controller = useDesktopWorkspace();

  const mode = useMemo(
    () => createModeController(modeState),
    [modeState.mode, modeState.setMode, modeState.isReady]
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

  return (
    <ModeContext.Provider value={mode}>
      <VaultContext.Provider value={vault}>
        <TreeContext.Provider value={tree}>
          <DocContext.Provider value={doc}>
            <CommandContext.Provider value={command}>
              <DialogContext.Provider value={dialog}>{children}</DialogContext.Provider>
            </CommandContext.Provider>
          </DocContext.Provider>
        </TreeContext.Provider>
      </VaultContext.Provider>
    </ModeContext.Provider>
  );
};

const useRequiredContext = <T,>(ctx: T | null, name: string): T => {
  if (!ctx) {
    throw new Error(`${name} must be used within <WorkspaceControllerProvider>`);
  }
  return ctx;
};

export const useWorkspaceMode = () =>
  useRequiredContext(useContext(ModeContext), 'useWorkspaceMode');
export const useWorkspaceVault = () =>
  useRequiredContext(useContext(VaultContext), 'useWorkspaceVault');
export const useWorkspaceTree = () =>
  useRequiredContext(useContext(TreeContext), 'useWorkspaceTree');
export const useWorkspaceDoc = () => useRequiredContext(useContext(DocContext), 'useWorkspaceDoc');
export const useWorkspaceCommand = () =>
  useRequiredContext(useContext(CommandContext), 'useWorkspaceCommand');
export const useWorkspaceDialog = () =>
  useRequiredContext(useContext(DialogContext), 'useWorkspaceDialog');
