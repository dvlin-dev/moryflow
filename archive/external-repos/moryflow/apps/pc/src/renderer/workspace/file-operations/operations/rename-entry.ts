import { useCallback } from 'react';

import { ensureMarkdownExtension, sanitizeEntryName } from '../../utils';
import type { TranslateFunction, UseVaultFileOperationsOptions, VaultGuard } from '../types';

type RenameEntryDeps = Pick<
  UseVaultFileOperationsOptions,
  | 'vault'
  | 'selectedEntry'
  | 'fetchTree'
  | 'setPendingSelectionPath'
  | 'setPendingOpenPath'
  | 'setOpenTabs'
  | 'showInputDialog'
> & { ensureVaultSelected: VaultGuard; t: TranslateFunction };

/**
 * 重命名文件或文件夹，保持打开标签状态同步。
 */
export const useRenameEntry = ({
  t,
  ensureVaultSelected,
  vault,
  selectedEntry,
  fetchTree,
  setPendingSelectionPath,
  setPendingOpenPath,
  setOpenTabs,
  showInputDialog,
}: RenameEntryDeps) =>
  useCallback(async () => {
    if (!ensureVaultSelected()) {
      return;
    }
    if (!selectedEntry) {
      window.alert(t('pleaseSelectToRename'));
      return;
    }
    const next = await showInputDialog({
      title: selectedEntry.type === 'file' ? t('renameFile') : t('renameFolder'),
      description: selectedEntry.type === 'file' ? t('enterNewFileName') : t('enterNewFolderName'),
      defaultValue: selectedEntry.name.replace(/\.md$/, ''),
      placeholder: selectedEntry.name,
    });
    if (next === null) {
      return;
    }
    const sanitized = sanitizeEntryName(next);
    if (!sanitized) {
      window.alert(t('invalidNewName'));
      return;
    }
    const nextName = selectedEntry.type === 'file' ? ensureMarkdownExtension(sanitized) : sanitized;
    try {
      const result = await window.desktopAPI.files.rename({ path: selectedEntry.path, nextName });
      setPendingSelectionPath(result.path);
      if (selectedEntry.type === 'file') {
        setPendingOpenPath(result.path);
        setOpenTabs((tabs) =>
          tabs.map((tab) =>
            tab.path === selectedEntry.path ? { ...tab, name: nextName, path: result.path } : tab,
          ),
        );
      }
      await fetchTree(vault!.path);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('renameFailed'));
    }
  }, [
    t,
    ensureVaultSelected,
    vault,
    selectedEntry,
    fetchTree,
    setPendingSelectionPath,
    setPendingOpenPath,
    setOpenTabs,
    showInputDialog,
  ]);
