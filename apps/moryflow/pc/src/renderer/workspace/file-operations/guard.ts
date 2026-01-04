import { useCallback } from 'react';
import type { VaultInfo } from '@shared/ipc';

import type { TranslateFunction, VaultGuard } from './types';

/**
 * 校验是否已选择 Vault，未选择时弹窗并终止操作。
 */
export const useVaultGuard = (vault: VaultInfo | null, t: TranslateFunction): VaultGuard =>
  useCallback(() => {
    if (!vault) {
      window.alert(t('pleaseSelectVault'));
      return false;
    }
    return true;
  }, [vault, t]);
