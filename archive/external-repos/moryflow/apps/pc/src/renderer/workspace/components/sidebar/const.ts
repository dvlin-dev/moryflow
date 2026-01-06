/**
 * [DEFINES]: Sidebar 组件类型定义
 * [USED_BY]: sidebar/index.tsx, sidebar/components/*
 * [POS]: 侧边栏类型定义文件
 */

import type { VaultInfo, VaultTreeNode } from '@shared/ipc'
import type { SettingsSection } from '@/components/settings-dialog/const'

/** 侧边栏主组件 Props */
export type SidebarProps = {
  /** 当前 Vault */
  vault: VaultInfo | null
  /** 文件树 */
  tree: VaultTreeNode[]
  /** 展开的路径集合 */
  expandedPaths: string[]
  /** 树加载状态 */
  treeState: 'idle' | 'loading' | 'error'
  /** 树加载错误信息 */
  treeError: string | null
  /** 选中的节点 ID */
  selectedId: string | null
  /** 打开设置 */
  onSettingsOpen: (section?: SettingsSection) => void
  /** 选择节点 */
  onSelectNode: (node: VaultTreeNode) => void
  /** 展开路径变更 */
  onExpandedPathsChange: (paths: string[]) => void
  /** 打开文件 */
  onOpenFile: (node: VaultTreeNode) => void
  /** 重命名节点 */
  onRename: (node: VaultTreeNode) => void
  /** 删除节点 */
  onDelete: (node: VaultTreeNode) => void
  /** 创建文件 */
  onCreateFile: (node: VaultTreeNode) => void
  /** 在 Finder 中显示 */
  onShowInFinder: (node: VaultTreeNode) => void
  /** 移动节点 */
  onMove: (sourcePath: string, targetPath: string) => void
  /** 在根目录创建文件 */
  onCreateFileInRoot: () => void
  /** 在根目录创建文件夹 */
  onCreateFolderInRoot: () => void
  /** 打开 AI Tab */
  onOpenAITab: () => void
  /** 打开 Sites CMS */
  onOpenSites: () => void
}

/** 侧边栏导航区 Props */
export type SidebarNavProps = {
  onSearch: () => void
  onOpenAI: () => void
  onSites: () => void
}

/** 侧边栏工具区 Props */
export type SidebarToolsProps = {
  vault: VaultInfo | null
  onSettingsOpen: (section?: SettingsSection) => void
}

/** 文件列表区 Props */
export type SidebarFilesProps = {
  vault: VaultInfo | null
  tree: VaultTreeNode[]
  expandedPaths: string[]
  treeState: 'idle' | 'loading' | 'error'
  treeError: string | null
  selectedId: string | null
  onSelectNode: (node: VaultTreeNode) => void
  onExpandedPathsChange: (paths: string[]) => void
  onOpenFile: (node: VaultTreeNode) => void
  onRename: (node: VaultTreeNode) => void
  onDelete: (node: VaultTreeNode) => void
  onCreateFile: (node: VaultTreeNode) => void
  onShowInFinder: (node: VaultTreeNode) => void
  onMove: (sourcePath: string, targetPath: string) => void
  onCreateFileInRoot: () => void
  onCreateFolderInRoot: () => void
  onPublish: (node: VaultTreeNode) => void
}
