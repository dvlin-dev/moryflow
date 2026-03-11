import { useCallback } from 'react';
import type { VaultTreeNode } from '@shared/ipc';

import { resolveParentPath } from '../../utils';
import type { TranslateFunction, UseVaultFileOperationsOptions, VaultGuard } from '../types';

type CreateFolderDeps = Pick<
  UseVaultFileOperationsOptions,
  'vault' | 'selectedEntry' | 'fetchTree' | 'setPendingSelectionPath'
> & { ensureVaultSelected: VaultGuard; t: TranslateFunction };

type CreateFolderOptions = {
  forceRoot?: boolean;
  targetNode?: VaultTreeNode;
};

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
}: CreateFolderDeps) =>
  useCallback(
    async (options?: CreateFolderOptions) => {
      if (!ensureVaultSelected()) {
        return;
      }
      const targetEntry = options?.forceRoot ? null : (options?.targetNode ?? selectedEntry);
      const parentPath = resolveParentPath(vault, targetEntry) || vault!.path;
      try {
        const result = await window.desktopAPI.files.createFolder({
          parentPath,
          name: 'NewFolder',
        });
        setPendingSelectionPath(result.path);
        await fetchTree(vault!.path);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : t('createFolderFailed'));
      }
    },
    [t, ensureVaultSelected, vault, selectedEntry, fetchTree, setPendingSelectionPath]
  );
