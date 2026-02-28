/**
 * [DEFINES]: Sidebar 组件类型定义
 * [USED_BY]: sidebar/index.tsx, sidebar/components/*
 * [POS]: 侧边栏类型定义文件
 */

import type { VaultInfo, VaultTreeNode } from '@shared/ipc';

/** 侧边栏全局横向 gutter（统一来源） */
export const SIDEBAR_GUTTER_X_CLASS = 'px-3.5';

/**
 * 线程/文件列表 inset（独立维护）：
 * - 列表项激活态背景可有单独视觉规则
 * - 仅约束文本左对齐基线
 */
export const SIDEBAR_LIST_INSET_X_CLASS = 'px-3.5';

/** 文件列表区 Props */
export type SidebarFilesProps = {
  vault: VaultInfo | null;
  tree: VaultTreeNode[];
  expandedPaths: string[];
  treeState: 'idle' | 'loading' | 'error';
  treeError: string | null;
  selectedId: string | null;
  onSelectNode: (node: VaultTreeNode) => void;
  onExpandedPathsChange: (paths: string[]) => void;
  onOpenFile: (node: VaultTreeNode) => void;
  onRename: (node: VaultTreeNode) => void;
  onDelete: (node: VaultTreeNode) => void;
  onCreateFile: (node: VaultTreeNode) => void;
  onShowInFinder: (node: VaultTreeNode) => void;
  onMove: (sourcePath: string, targetPath: string) => void;
  onCreateFileInRoot: () => void;
  onCreateFolderInRoot: () => void;
  onPublish: (node: VaultTreeNode) => void;
};
