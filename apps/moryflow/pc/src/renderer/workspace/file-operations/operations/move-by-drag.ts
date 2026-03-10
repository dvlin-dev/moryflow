import { useCallback } from 'react';

import type { TranslateFunction, UseVaultFileOperationsOptions, VaultGuard } from '../types';
import { getParentDirectoryPath } from '../../utils';

type MoveByDragDeps = Pick<
  UseVaultFileOperationsOptions,
  'vault' | 'refreshSubtree' | 'setPendingSelectionPath' | 'setPendingOpenPath' | 'setOpenTabs'
> & { ensureVaultSelected: VaultGuard; t: TranslateFunction };

/**
 * 拖拽移动时复用统一的移动逻辑，保持标签与选中状态一致。
 */
export const useMoveByDrag = ({
  t,
  ensureVaultSelected,
  vault,
  refreshSubtree,
  setPendingSelectionPath,
  setPendingOpenPath,
  setOpenTabs,
}: MoveByDragDeps) =>
  useCallback(
    async (sourcePath: string, targetDir: string) => {
      if (!ensureVaultSelected()) {
        return;
      }
      try {
        const result = await window.desktopAPI.files.move({
          path: sourcePath,
          targetDir,
        });

        setOpenTabs((tabs) =>
          tabs.map((tab) => (tab.path === sourcePath ? { ...tab, path: result.path } : tab))
        );

        setPendingSelectionPath(result.path);
        setPendingOpenPath(result.path);

        const sourceParentDir = getParentDirectoryPath(sourcePath);
        await Promise.all([refreshSubtree(sourceParentDir), refreshSubtree(targetDir)]);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : t('moveFailed'));
        throw error;
      }
    },
    [
      t,
      ensureVaultSelected,
      vault,
      refreshSubtree,
      setPendingSelectionPath,
      setPendingOpenPath,
      setOpenTabs,
    ]
  );
