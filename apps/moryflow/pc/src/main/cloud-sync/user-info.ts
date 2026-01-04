/**
 * [PROVIDES]: fetchCurrentUserId, clearUserIdCache - 获取当前登录用户 ID
 * [DEPENDS]: membershipBridge, @aiget/api
 * [POS]: 为 main 进程提供用户 ID 获取功能，用于绑定冲突检测
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { createServerApiClient } from '@aiget/api/client'
import { MEMBERSHIP_API_URL } from '@aiget/api'
import { membershipBridge } from '../membership-bridge.js'
import { createLogger } from './logger.js'

const log = createLogger('user-info')

// 缓存用户 ID，避免重复请求
let cachedUserId: string | null = null

/**
 * 获取当前登录用户的 ID
 * 优先返回缓存值，否则调用 API 获取
 */
export async function fetchCurrentUserId(): Promise<string | null> {
  const config = membershipBridge.getConfig()
  if (!config.token) {
    cachedUserId = null
    return null
  }

  // 使用缓存
  if (cachedUserId) {
    return cachedUserId
  }

  try {
    const client = createServerApiClient({
      baseUrl: MEMBERSHIP_API_URL,
      tokenProvider: { getToken: () => config.token },
    })

    const user = await client.user.fetchCurrent()
    cachedUserId = user.id
    log.info('fetched user ID:', cachedUserId)
    return cachedUserId
  } catch (error) {
    log.error('failed to fetch user ID:', error)
    return null
  }
}

/**
 * 清除用户 ID 缓存
 * 在用户登出时调用
 */
export function clearUserIdCache(): void {
  cachedUserId = null
  log.info('user ID cache cleared')
}
