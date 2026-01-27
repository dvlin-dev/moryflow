/**
 * [DEFINES]: VaultFilesProps, ContextMenuAction, ContextMenuItem, DragData, DropValidation
 * [USED_BY]: vault-files 组件系列
 * [POS]: 文件树组件的类型定义和常量（Lucide 图标类型）
 */

import type { LucideIcon } from 'lucide-react';
import type { VaultTreeNode } from '@shared/ipc';

// 右键菜单动作类型
export type ContextMenuAction = 'rename' | 'delete' | 'createFile' | 'showInFinder' | 'publish';

export type ContextMenuItem = {
  action: ContextMenuAction;
  /** i18n key for menu item label */
  labelKey: string;
  icon?: LucideIcon;
  dangerous?: boolean;
};

// 拖拽数据
export type DragData = {
  nodeId: string;
  nodePath: string;
  nodeType: 'file' | 'folder';
  nodeName: string;
};

// 拖拽验证结果
export type DropValidation = {
  canDrop: boolean;
  /** i18n key for validation error message */
  reasonKey?: string;
};

// 根目录的特殊标识
export const ROOT_DROP_TARGET_ID = '__root__';

// VaultFiles 组件 props
export type VaultFilesProps = {
  nodes: VaultTreeNode[];
  /** vault 根目录路径，用于拖拽到空白处时移动到根目录 */
  vaultPath?: string;
  selectedId?: string | null;
  expandedPaths?: string[];
  onExpandedPathsChange?: (paths: string[]) => void;
  onSelectFile?: (node: VaultTreeNode) => void;
  onSelectNode?: (node: VaultTreeNode) => void;
  onRename?: (node: VaultTreeNode) => void;
  onDelete?: (node: VaultTreeNode) => void;
  onCreateFile?: (node: VaultTreeNode) => void;
  onShowInFinder?: (node: VaultTreeNode) => void;
  onMove?: (sourcePath: string, targetDir: string) => void | Promise<void>;
  onCreateFileInRoot?: () => void;
  onPublish?: (node: VaultTreeNode) => void;
};
