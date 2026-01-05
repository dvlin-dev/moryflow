import { useCallback } from 'react';

import type { TranslateFunction, UseVaultFileOperationsOptions, VaultGuard } from '../types';

type ShowInFinderDeps = Pick<UseVaultFileOperationsOptions, 'vault'> & {
  ensureVaultSelected: VaultGuard;
  t: TranslateFunction;
};

/**
 * 打开访达显示指定路径。
 */
export const useShowInFinder = ({ ensureVaultSelected, vault, t }: ShowInFinderDeps) =>
  useCallback(
    async (path: string) => {
      if (!ensureVaultSelected()) {
        return;
      }
      try {
        await window.desktopAPI.files.showInFinder({ path });
      } catch (error) {
        window.alert(error instanceof Error ? error.message : t('cannotOpenFinder'));
      }
    },
    [ensureVaultSelected, vault, t],
  );
