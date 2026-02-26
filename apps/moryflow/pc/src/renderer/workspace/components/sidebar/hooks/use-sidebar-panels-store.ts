/**
 * [PROVIDES]: useSidebarPanelsStore/useSyncSidebarPanelsStore - Sidebar agent 子面板 store
 * [DEPENDS]: zustand (vanilla) + React useEffect
 * [POS]: Sidebar -> AgentSubPanels 状态桥接层，收敛 props 平铺
 * [UPDATE]: 2026-02-26 - 新增 sidebar panels store，AgentSubPanels 改为就地 selector 取数
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useLayoutEffect } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { VaultInfo, VaultTreeNode } from '@shared/ipc';
import type { AgentSub } from '../../../navigation/state';

type SidebarPanelsSnapshot = {
  agentSub: AgentSub;
  vault: VaultInfo | null;
  tree: VaultTreeNode[];
  expandedPaths: string[];
  treeState: 'idle' | 'loading' | 'error';
  treeError: string | null;
  selectedId: string | null;
  onOpenThread: (threadId: string) => void;
  onSelectNode: (node: VaultTreeNode) => void;
  onExpandedPathsChange: (paths: string[]) => void;
  onOpenFile: (node: VaultTreeNode) => void;
  onRename: (node: VaultTreeNode) => void;
  onDelete: (node: VaultTreeNode) => void;
  onCreateFile: (node: VaultTreeNode) => void;
  onShowInFinder: (node: VaultTreeNode) => void;
  onMove: (sourcePath: string, targetPath: string) => void | Promise<void>;
  onCreateFileInRoot: () => void;
  onCreateFolderInRoot: () => void;
  onPublish: (node: VaultTreeNode) => void;
};

type SidebarPanelsStoreState = SidebarPanelsSnapshot & {
  setSnapshot: (snapshot: SidebarPanelsSnapshot) => void;
};

const noop = () => {};

const sidebarPanelsStore = createStore<SidebarPanelsStoreState>((set) => ({
  agentSub: 'chat',
  vault: null,
  tree: [],
  expandedPaths: [],
  treeState: 'idle',
  treeError: null,
  selectedId: null,
  onOpenThread: noop,
  onSelectNode: noop,
  onExpandedPathsChange: noop,
  onOpenFile: noop,
  onRename: noop,
  onDelete: noop,
  onCreateFile: noop,
  onShowInFinder: noop,
  onMove: noop,
  onCreateFileInRoot: noop,
  onCreateFolderInRoot: noop,
  onPublish: noop,
  setSnapshot: (snapshot) => set(snapshot),
}));

export const useSidebarPanelsStore = <T,>(selector: (state: SidebarPanelsStoreState) => T): T =>
  useStore(sidebarPanelsStore, selector);

export const useSyncSidebarPanelsStore = (snapshot: SidebarPanelsSnapshot) => {
  useLayoutEffect(() => {
    sidebarPanelsStore.getState().setSnapshot(snapshot);
  }, [snapshot]);
};
