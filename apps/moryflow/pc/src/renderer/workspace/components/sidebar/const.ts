/**
 * [DEFINES]: Sidebar 组件类型定义
 * [USED_BY]: sidebar/index.tsx, sidebar/components/*
 * [POS]: 侧边栏类型定义文件
 */

import type { VaultInfo, VaultTreeNode } from '@shared/ipc';
import type { SettingsSection } from '@/components/settings-dialog/const';

/** 侧边栏工具区 Props */
export type SidebarToolsProps = {
  vault: VaultInfo | null;
  onSettingsOpen: (section?: SettingsSection) => void;
};

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
