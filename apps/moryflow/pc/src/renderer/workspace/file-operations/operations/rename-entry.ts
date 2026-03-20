import { useCallback } from 'react';
import type { VaultTreeNode } from '@shared/ipc';

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
 * @param targetNode 指定目标节点（优先级高于 selectedEntry），右键菜单场景使用
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
  useCallback(
    async (targetNode?: VaultTreeNode) => {
      if (!ensureVaultSelected()) {
        return;
      }
      const entry = targetNode ?? selectedEntry;
      if (!entry) {
        window.alert(t('pleaseSelectToRename'));
        return;
      }
      const next = await showInputDialog({
        title: entry.type === 'file' ? t('renameFile') : t('renameFolder'),
        description: entry.type === 'file' ? t('enterNewFileName') : t('enterNewFolderName'),
        defaultValue: entry.name.replace(/\.md$/, ''),
        placeholder: entry.name,
      });
      if (next === null) {
        return;
      }
      const sanitized = sanitizeEntryName(next);
      if (!sanitized) {
        window.alert(t('invalidNewName'));
        return;
      }
      const nextName = entry.type === 'file' ? ensureMarkdownExtension(sanitized) : sanitized;
      try {
        const result = await window.desktopAPI.files.rename({ path: entry.path, nextName });
        setPendingSelectionPath(result.path);
        if (entry.type === 'file') {
          setPendingOpenPath(result.path);
          setOpenTabs((tabs) =>
            tabs.map((tab) =>
              tab.path === entry.path ? { ...tab, name: nextName, path: result.path } : tab
            )
          );
        }
        await fetchTree(vault!.path);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : t('renameFailed'));
      }
    },
    [
      t,
      ensureVaultSelected,
      vault,
      selectedEntry,
      fetchTree,
      setPendingSelectionPath,
      setPendingOpenPath,
      setOpenTabs,
      showInputDialog,
    ]
  );
