/**
 * [PROVIDES]: useVaultFilesStore/useSyncVaultFilesStore
 * [DEPENDS]: zustand vanilla + React useLayoutEffect
 * [POS]: VaultFiles 共享业务状态（store-first），替代 Context 透传
 * [UPDATE]: 2026-02-26 - 迁移文件树共享状态到 store，子组件就地 selector 取数
 * [UPDATE]: 2026-02-26 - 增加 shouldSync 快照比较，避免无变化时重复 setSnapshot 引发 getSnapshot 循环更新
 */

import { useLayoutEffect } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { VaultTreeNode } from '@shared/ipc';

type VaultFilesSnapshot = {
  selectedId: string | null;
  onSelectFile?: (node: VaultTreeNode) => void;
  onSelectNode?: (node: VaultTreeNode) => void;
  onRename?: (node: VaultTreeNode) => void;
  onDelete?: (node: VaultTreeNode) => void;
  onCreateFile?: (node: VaultTreeNode) => void;
  onShowInFinder?: (node: VaultTreeNode) => void;
  onPublish?: (node: VaultTreeNode) => void;
  onMove?: (sourcePath: string, targetDir: string) => void | Promise<void>;
  draggedNodeId: string | null;
  setDraggedNodeId: (id: string | null) => void;
  dropTargetId: string | null;
  setDropTargetId: (id: string | null) => void;
};

type VaultFilesStoreState = VaultFilesSnapshot & {
  setSnapshot: (snapshot: VaultFilesSnapshot) => void;
};

const noop = () => {};

const vaultFilesStore = createStore<VaultFilesStoreState>((set) => ({
  selectedId: null,
  onSelectFile: undefined,
  onSelectNode: undefined,
  onRename: undefined,
  onDelete: undefined,
  onCreateFile: undefined,
  onShowInFinder: undefined,
  onPublish: undefined,
  onMove: undefined,
  draggedNodeId: null,
  setDraggedNodeId: noop,
  dropTargetId: null,
  setDropTargetId: noop,
  setSnapshot: (snapshot) => set(snapshot),
}));

const shouldSyncSnapshot = (current: VaultFilesStoreState, next: VaultFilesSnapshot) =>
  current.selectedId !== next.selectedId ||
  current.onSelectFile !== next.onSelectFile ||
  current.onSelectNode !== next.onSelectNode ||
  current.onRename !== next.onRename ||
  current.onDelete !== next.onDelete ||
  current.onCreateFile !== next.onCreateFile ||
  current.onShowInFinder !== next.onShowInFinder ||
  current.onPublish !== next.onPublish ||
  current.onMove !== next.onMove ||
  current.draggedNodeId !== next.draggedNodeId ||
  current.setDraggedNodeId !== next.setDraggedNodeId ||
  current.dropTargetId !== next.dropTargetId ||
  current.setDropTargetId !== next.setDropTargetId;

export const useVaultFilesStore = <T>(selector: (state: VaultFilesStoreState) => T): T =>
  useStore(vaultFilesStore, selector);

export const useSyncVaultFilesStore = (snapshot: VaultFilesSnapshot) => {
  useLayoutEffect(() => {
    const state = vaultFilesStore.getState();
    if (!shouldSyncSnapshot(state, snapshot)) {
      return;
    }
    state.setSnapshot(snapshot);
  }, [snapshot]);
};
