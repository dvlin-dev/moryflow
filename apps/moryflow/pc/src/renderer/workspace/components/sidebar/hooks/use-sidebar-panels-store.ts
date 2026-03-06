/**
 * [PROVIDES]: useSidebarPanelsStore/useSyncSidebarPanelsStore - Sidebar 布局路由 store
 * [DEPENDS]: zustand (vanilla) + React useEffect
 * [POS]: Sidebar -> SidebarLayoutRouter 状态桥接层，收敛 props 平铺
 * [UPDATE]: 2026-02-26 - 新增 shouldSync 快照比较，避免每次 render 无变化重复 setSnapshot
 * [UPDATE]: 2026-02-26 - 新增 sidebar panels store，侧栏内容改为就地 selector 取数
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useLayoutEffect } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { VaultInfo, VaultTreeNode } from '@shared/ipc';
import type { Destination, SidebarMode } from '../../../navigation/state';

type SidebarPanelsSnapshot = {
  destination: Destination;
  sidebarMode: SidebarMode;
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
  destination: 'agent',
  sidebarMode: 'chat',
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

const shouldSyncSnapshot = (current: SidebarPanelsStoreState, next: SidebarPanelsSnapshot) =>
  current.destination !== next.destination ||
  current.sidebarMode !== next.sidebarMode ||
  current.vault !== next.vault ||
  current.tree !== next.tree ||
  current.expandedPaths !== next.expandedPaths ||
  current.treeState !== next.treeState ||
  current.treeError !== next.treeError ||
  current.selectedId !== next.selectedId ||
  current.onOpenThread !== next.onOpenThread ||
  current.onSelectNode !== next.onSelectNode ||
  current.onExpandedPathsChange !== next.onExpandedPathsChange ||
  current.onOpenFile !== next.onOpenFile ||
  current.onRename !== next.onRename ||
  current.onDelete !== next.onDelete ||
  current.onCreateFile !== next.onCreateFile ||
  current.onShowInFinder !== next.onShowInFinder ||
  current.onMove !== next.onMove ||
  current.onCreateFileInRoot !== next.onCreateFileInRoot ||
  current.onCreateFolderInRoot !== next.onCreateFolderInRoot ||
  current.onPublish !== next.onPublish;

export const useSidebarPanelsStore = <T>(selector: (state: SidebarPanelsStoreState) => T): T =>
  useStore(sidebarPanelsStore, selector);

export const useSyncSidebarPanelsStore = (snapshot: SidebarPanelsSnapshot) => {
  useLayoutEffect(() => {
    const state = sidebarPanelsStore.getState();
    if (!shouldSyncSnapshot(state, snapshot)) {
      return;
    }
    state.setSnapshot(snapshot);
  }, [snapshot]);
};
