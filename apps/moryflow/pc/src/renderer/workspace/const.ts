import type { CommandAction } from '@/components/command-palette/const';
import type { VaultInfo, VaultTreeNode } from '@shared/ipc';

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

export type DesktopWorkspaceProps = {
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
  commandActions: CommandAction[];
  inputDialogState: InputDialogState;
  /** 侧边栏是否收起 */
  sidebarCollapsed: boolean;
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
  /** 切换侧边栏收起状态 */
  onToggleSidebar: () => void;
};
