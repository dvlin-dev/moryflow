import { useCallback } from 'react';

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
  useCallback(async () => {
    if (!ensureVaultSelected()) {
      return;
    }
    if (!selectedEntry) {
      window.alert(t('pleaseSelectToDelete'));
      return;
    }
    const confirmed = window.confirm(t('confirmDeleteEntry', { name: selectedEntry.name }));
    if (!confirmed) {
      return;
    }
    try {
      await window.desktopAPI.files.delete({ path: selectedEntry.path });
      if (activeDoc?.path === selectedEntry.path) {
        resetEditorState();
      }
      if (selectedEntry.type === 'file') {
        setOpenTabs((tabs) => tabs.filter((tab) => tab.path !== selectedEntry.path));
      }
      setSelectedEntry(null);
      await fetchTree(vault!.path);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('deleteFailed'));
    }
  }, [
    t,
    ensureVaultSelected,
    vault,
    selectedEntry,
    activeDoc,
    fetchTree,
    resetEditorState,
    setOpenTabs,
    setSelectedEntry,
  ]);
