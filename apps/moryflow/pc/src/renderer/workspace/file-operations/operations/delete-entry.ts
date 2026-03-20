import { useCallback } from 'react';
import type { VaultTreeNode } from '@shared/ipc';

import type { TranslateFunction, UseVaultFileOperationsOptions, VaultGuard } from '../types';

type DeleteEntryDeps = Pick<
  UseVaultFileOperationsOptions,
  | 'vault'
  | 'selectedEntry'
  | 'activeDoc'
  | 'fetchTree'
  | 'resetEditorState'
  | 'setOpenTabs'
  | 'setSelectedEntry'
> & { ensureVaultSelected: VaultGuard; t: TranslateFunction };

/**
 * 删除文件或文件夹，附带编辑器状态清理与标签同步。
 * @param targetNode 指定目标节点（优先级高于 selectedEntry），右键菜单场景使用
 */
export const useDeleteEntry = ({
  t,
  ensureVaultSelected,
  vault,
  selectedEntry,
  activeDoc,
  fetchTree,
  resetEditorState,
  setOpenTabs,
  setSelectedEntry,
}: DeleteEntryDeps) =>
  useCallback(
    async (targetNode?: VaultTreeNode) => {
      if (!ensureVaultSelected()) {
        return;
      }
      const entry = targetNode ?? selectedEntry;
      if (!entry) {
        window.alert(t('pleaseSelectToDelete'));
        return;
      }
      const confirmed = window.confirm(t('confirmDeleteEntry', { name: entry.name }));
      if (!confirmed) {
        return;
      }
      try {
        await window.desktopAPI.files.delete({ path: entry.path });
        if (activeDoc?.path === entry.path) {
          resetEditorState();
        }
        if (entry.type === 'file') {
          setOpenTabs((tabs) => tabs.filter((tab) => tab.path !== entry.path));
        }
        setSelectedEntry(null);
        await fetchTree(vault!.path);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : t('deleteFailed'));
      }
    },
    [
      t,
      ensureVaultSelected,
      vault,
      selectedEntry,
      activeDoc,
      fetchTree,
      resetEditorState,
      setOpenTabs,
      setSelectedEntry,
    ]
  );
