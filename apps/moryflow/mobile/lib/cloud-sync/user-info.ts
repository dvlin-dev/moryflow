/**
 * [PROVIDES]: fetchCurrentUserId, clearUserIdCache - 获取当前登录用户 ID
 * [DEPENDS]: server api
 * [POS]: Mobile 云同步获取用户 ID（用于绑定冲突检测）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { createLogger } from '@/lib/agent-runtime';
import { getAccessToken } from '@/lib/server/auth-session';
import { fetchCurrentUser } from '@/lib/server/api';

const logger = createLogger('[CloudSync]');

let cachedUser: { token: string; userId: string } | null = null;

/**
 * 获取当前登录用户 ID
 */
export async function fetchCurrentUserId(): Promise<string | null> {
  const token = getAccessToken();
  if (!token) {
    cachedUser = null;
    return null;
  }

  if (cachedUser?.token === token) {
    return cachedUser.userId;
  }

  try {
    const user = await fetchCurrentUser();
    cachedUser = {
      token,
      userId: user.id,
    };
    return user.id;
  } catch (error) {
    logger.error('Failed to fetch user ID:', error);
    return null;
  }
}

/**
 * 清理用户 ID 缓存
 */
export function clearUserIdCache(): void {
  cachedUser = null;
}
