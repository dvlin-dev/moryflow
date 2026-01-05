/**
 * Membership 配置桥接
 *
 * 用于将会员配置同步到 Agent Runtime
 */

import { getStoredToken } from '@/lib/server/storage'
import { MEMBERSHIP_API_URL } from '@moryflow/shared-api'
import type { MembershipConfig } from '@moryflow/agents-runtime'

// 内存中的配置（运行时使用）
let membershipConfig: MembershipConfig = {
  enabled: false,
  apiUrl: MEMBERSHIP_API_URL,
  token: null,
}

/**
 * 获取当前会员配置
 */
export function getMembershipConfig(): MembershipConfig {
  return membershipConfig
}

/**
 * 更新会员配置
 */
export function setMembershipConfig(config: Partial<MembershipConfig>): void {
  membershipConfig = { ...membershipConfig, ...config }
}

/**
 * 同步会员配置
 *
 * 在 MembershipProvider 中调用，保持配置与登录状态同步
 */
export async function syncMembershipConfig(enabled: boolean): Promise<void> {
  const token = await getStoredToken()
  setMembershipConfig({
    token,
    enabled,
    apiUrl: MEMBERSHIP_API_URL,
  })
}
