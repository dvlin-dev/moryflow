/**
 * [PROVIDES]: fetchCurrentUserId, clearUserIdCache - 获取当前登录用户 ID
 * [DEPENDS]: server api
 * [POS]: Mobile 云同步获取用户 ID（用于绑定冲突检测）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { createLogger } from '@/lib/agent-runtime';
import { fetchCurrentUser } from '@/lib/server/api';

const logger = createLogger('[CloudSync]');

let cachedUserId: string | null = null;

/**
 * 获取当前登录用户 ID
 */
export async function fetchCurrentUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId;

  try {
    const user = await fetchCurrentUser();
    cachedUserId = user.id;
    return cachedUserId;
  } catch (error) {
    logger.error('Failed to fetch user ID:', error);
    return null;
  }
}

/**
 * 清理用户 ID 缓存
 */
export function clearUserIdCache(): void {
  cachedUserId = null;
}
