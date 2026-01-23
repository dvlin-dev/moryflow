/**
 * [PROVIDES]: 会员配置桥接
 * [DEPENDS]: auth-session, agents-runtime
 * [POS]: Mobile 端 Agent Runtime 会员配置同步
 */

import { getAccessToken } from '@/lib/server/auth-session';
import { MEMBERSHIP_API_URL } from '@anyhunt/api';
import type { MembershipConfig } from '@anyhunt/agents-runtime';

// 内存中的配置（运行时使用）
let membershipConfig: MembershipConfig = {
  enabled: false,
  apiUrl: MEMBERSHIP_API_URL,
  token: null,
};

/**
 * 获取当前会员配置
 */
export function getMembershipConfig(): MembershipConfig {
  return membershipConfig;
}

/**
 * 更新会员配置
 */
export function setMembershipConfig(config: Partial<MembershipConfig>): void {
  membershipConfig = { ...membershipConfig, ...config };
}

/**
 * 同步会员配置
 *
 * 在 MembershipProvider 中调用，保持配置与登录状态同步
 */
export function syncMembershipConfig(enabled: boolean): void {
  const token = getAccessToken();
  setMembershipConfig({
    token,
    enabled,
    apiUrl: MEMBERSHIP_API_URL,
  });
}
