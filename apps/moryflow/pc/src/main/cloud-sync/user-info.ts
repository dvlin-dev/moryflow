/**
 * [PROVIDES]: fetchCurrentUserId, clearUserIdCache - 获取当前登录用户 ID
 * [DEPENDS]: membershipBridge, /api
 * [POS]: 为 main 进程提供用户 ID 获取功能，用于绑定冲突检测
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { createApiClient, MEMBERSHIP_API_URL, USER_API } from '@moryflow/api';
import { membershipBridge } from '../membership-bridge.js';
import { createLogger } from './logger.js';

const log = createLogger('user-info');

// 按 token 维度缓存用户 ID，避免账号切换时复用旧值
let cachedUser: { token: string; userId: string } | null = null;

/**
 * 获取当前登录用户的 ID
 * 优先返回缓存值，否则调用 API 获取
 */
export async function fetchCurrentUserId(): Promise<string | null> {
  const config = membershipBridge.getConfig();
  if (!config.token) {
    cachedUser = null;
    return null;
  }

  // 使用缓存
  if (cachedUser?.token === config.token) {
    return cachedUser.userId;
  }

  try {
    const client = createApiClient({
      baseUrl: MEMBERSHIP_API_URL,
      defaultAuthMode: 'bearer',
      getAccessToken: () => config.token,
    });

    const user = await client.get<{ id: string }>(USER_API.ME);
    cachedUser = {
      token: config.token,
      userId: user.id,
    };
    log.info('fetched user ID:', user.id);
    return user.id;
  } catch (error) {
    log.error('failed to fetch user ID:', error);
    return null;
  }
}

/**
 * 清除用户 ID 缓存
 * 在用户登出时调用
 */
export function clearUserIdCache(): void {
  cachedUser = null;
  log.info('user ID cache cleared');
}
