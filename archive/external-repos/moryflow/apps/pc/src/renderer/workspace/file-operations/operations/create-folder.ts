import { useCallback } from 'react';

import { resolveParentPath, sanitizeEntryName } from '../../utils';
import type { TranslateFunction, UseVaultFileOperationsOptions, VaultGuard } from '../types';

type CreateFolderDeps = Pick<
  UseVaultFileOperationsOptions,
  'vault' | 'selectedEntry' | 'fetchTree' | 'setPendingSelectionPath' | 'showInputDialog'
> & { ensureVaultSelected: VaultGuard; t: TranslateFunction };

/**
 * 新建文件夹，统一处理命名校验与目录刷新。
 * @param options.forceRoot 为 true 时强制在根目录创建，忽略 selectedEntry
 */
export const useCreateFolder = ({
  t,
  ensureVaultSelected,
  vault,
  selectedEntry,
  fetchTree,
  setPendingSelectionPath,
  showInputDialog,
}: CreateFolderDeps) =>
  useCallback(async (options?: { forceRoot?: boolean }) => {
    if (!ensureVaultSelected()) {
      return;
    }
    const input = await showInputDialog({
      title: t('createFolderTitle'),
      description: t('enterFolderName'),
      placeholder: t('folderNamePlaceholder'),
    });
    if (input === null) {
      return;
    }
    const sanitized = sanitizeEntryName(input);
    if (!sanitized) {
      window.alert(t('invalidFolderName'));
      return;
    }
    const targetEntry = options?.forceRoot ? null : selectedEntry;
    const parentPath = resolveParentPath(vault, targetEntry) || vault!.path;
    try {
      const result = await window.desktopAPI.files.createFolder({ parentPath, name: sanitized });
      setPendingSelectionPath(result.path);
      await fetchTree(vault!.path);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('createFolderFailed'));
    }
  }, [t, ensureVaultSelected, vault, selectedEntry, fetchTree, setPendingSelectionPath, showInputDialog]);
