/**
 * [PROVIDES]: checkAndResolveBindingConflict, resetBindingConflictState
 * [DEPENDS]: Alert, store.ts, user-info.ts
 * [POS]: Mobile 端绑定冲突检测与用户决策
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Alert } from 'react-native';
import { createLogger } from '@/lib/agent-runtime';
import { readBinding, deleteBinding } from './store';
import { fetchCurrentUserId, clearUserIdCache } from './user-info';

export type BindingConflictChoice = 'sync_to_current' | 'stay_offline';

export interface BindingConflictResult {
  hasConflict: boolean;
  choice?: BindingConflictChoice;
}

const logger = createLogger('[CloudSync]');

/**
 * 检查并解决绑定冲突
 */
export async function checkAndResolveBindingConflict(
  vaultPath: string
): Promise<BindingConflictResult> {
  const binding = await readBinding(vaultPath);

  if (!binding) {
    return { hasConflict: false };
  }

  if (!binding.userId) {
    logger.warn('Binding missing userId, treating as conflict');
    const choice = await requestBindingConflictResolution(binding.vaultName);
    if (choice === 'sync_to_current') {
      await deleteBinding(vaultPath);
    }
    return { hasConflict: true, choice };
  }

  const currentUserId = await fetchCurrentUserId();
  if (!currentUserId) {
    logger.warn('Cannot determine current user ID, staying offline');
    return { hasConflict: true, choice: 'stay_offline' };
  }

  if (binding.userId === currentUserId) {
    return { hasConflict: false };
  }

  logger.info('Binding conflict detected', {
    boundUserId: binding.userId,
    currentUserId,
    vaultName: binding.vaultName,
  });

  const choice = await requestBindingConflictResolution(binding.vaultName);

  if (choice === 'sync_to_current') {
    await deleteBinding(vaultPath);
  }

  return { hasConflict: true, choice };
}

/**
 * 清理状态（登出时调用）
 */
export function resetBindingConflictState(): void {
  clearUserIdCache();
}

function requestBindingConflictResolution(vaultName: string): Promise<BindingConflictChoice> {
  return new Promise((resolve) => {
    Alert.alert(
      'Workspace Sync Conflict',
      `The workspace "${vaultName}" was synced with a different account. Choose how to proceed.`,
      [
        {
          text: 'Stay Offline',
          style: 'cancel',
          onPress: () => resolve('stay_offline'),
        },
        {
          text: 'Sync to Current Account',
          style: 'default',
          onPress: () => resolve('sync_to_current'),
        },
      ]
    );
  });
}
