import type { VaultInfo, VaultTreeNode } from '@shared/ipc';
import type { SidebarMode, Destination } from './navigation/state';

type InputDialogState = {
  open: boolean;
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  resolve: ((value: string | null) => void) | null;
};

export type RequestState = 'idle' | 'loading' | 'error';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'error';

export type SelectedFile = {
  id: string;
  name: string;
  path: string;
  /** 是否已固定（编辑过的文件会被固定，未固定的是预览模式） */
  pinned?: boolean;
};

export type ActiveDocument = SelectedFile & {
  content: string;
  mtime: number | null;
};

/**
 * Workspace feature 的 Controller（Renderer 单例状态）。
 * - 由 `useDesktopWorkspace()` 产出
 * - 通过 Provider 拆分为多个 Context，供 UI 组件就地取值（避免巨型 props 透传）
 */
export type DesktopWorkspaceController = {
  vault: VaultInfo | null;
  vaultMessage: string | null;
  isPickingVault: boolean;
  tree: VaultTreeNode[];
  expandedPaths: string[];
  treeState: RequestState;
  treeError: string | null;
  selectedEntry: VaultTreeNode | null;
  selectedFile: SelectedFile | null;
  openTabs: SelectedFile[];
  activeDoc: ActiveDocument | null;
  docState: RequestState;
  docError: string | null;
  saveState: SaveState;
  commandOpen: boolean;
  inputDialogState: InputDialogState;
  onInputDialogConfirm: (value: string) => void;
  onInputDialogCancel: () => void;
  onCommandOpenChange: (open: boolean) => void;
  onVaultOpen: () => Promise<void>;
  onSelectDirectory: () => Promise<string | null>;
  onVaultCreate: (name: string, parentPath: string) => Promise<void>;
  onRefreshTree: () => void;
  onSelectTreeNode: (node: VaultTreeNode) => void;
  onExpandedPathsChange: (paths: string[]) => void;
  onOpenFile: (node: VaultTreeNode) => void;
  onSelectTab: (tab: SelectedFile) => void;
  onCloseTab: (path: string) => void;
  onEditorChange: (markdown: string) => void;
  onRetryLoad: () => void;
  /** 通过标题输入框重命名文件 */
  onRenameByTitle: (path: string, newName: string) => Promise<{ path: string; name: string }>;
  onTreeNodeRename: (node: VaultTreeNode) => void;
  onTreeNodeDelete: (node: VaultTreeNode) => void;
  onTreeNodeCreateFile: (node: VaultTreeNode) => void;
  onTreeNodeShowInFinder: (node: VaultTreeNode) => void;
  onTreeNodeMove: (sourcePath: string, targetDir: string) => void | Promise<void>;
  onCreateFileInRoot: () => void;
  onCreateFolderInRoot: () => void;
};

export type DesktopWorkspaceNavigationController = {
  destination: Destination;
  sidebarMode: SidebarMode;
  go: (destination: Destination) => void;
  setSidebarMode: (mode: SidebarMode) => void;
};

export type DesktopWorkspaceVaultController = {
  vault: VaultInfo | null;
  vaultMessage: string | null;
  isPickingVault: boolean;
  openVault: () => Promise<void>;
  selectDirectory: () => Promise<string | null>;
  createVault: (name: string, parentPath: string) => Promise<void>;
};

export type DesktopWorkspaceTreeController = {
  tree: VaultTreeNode[];
  expandedPaths: string[];
  treeState: RequestState;
  treeError: string | null;
  selectedEntry: VaultTreeNode | null;
  refreshTree: () => void;
  selectTreeNode: (node: VaultTreeNode) => void;
  setExpandedPaths: (paths: string[]) => void;
  openFileFromTree: (node: VaultTreeNode) => void;
  renameTreeNode: (node: VaultTreeNode) => void;
  deleteTreeNode: (node: VaultTreeNode) => void;
  createFileInTree: (node: VaultTreeNode) => void;
  showInFinder: (node: VaultTreeNode) => void;
  moveTreeNode: (sourcePath: string, targetDir: string) => void | Promise<void>;
  createFileInRoot: () => void;
  createFolderInRoot: () => void;
};

export type DesktopWorkspaceDocController = {
  selectedFile: SelectedFile | null;
  activeDoc: ActiveDocument | null;
  openTabs: SelectedFile[];
  docState: RequestState;
  docError: string | null;
  saveState: SaveState;
  selectTab: (tab: SelectedFile) => void;
  closeTab: (path: string) => void;
  editorChange: (markdown: string) => void;
  retryLoad: () => void;
  renameByTitle: (path: string, newName: string) => Promise<{ path: string; name: string }>;
};

export type DesktopWorkspaceCommandController = {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  openCommandPalette: () => void;
};

export type DesktopWorkspaceDialogController = {
  inputDialogState: InputDialogState;
  confirmInputDialog: (value: string) => void;
  cancelInputDialog: () => void;
};
