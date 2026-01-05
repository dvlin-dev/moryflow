/**
 * Membership 常量定义
 *
 * 从共享包重新导出，并添加 PC 端特有配置
 */

import { MEMBERSHIP_API_URL as MEMBERSHIP_API_URL_DEFAULT } from '@moryflow/shared-api'

// 从共享包导入并重新导出所有常量和工具函数
export {
  // 模型标识常量
  MEMBERSHIP_MODEL_PREFIX,
  MEMBERSHIP_PROVIDER_ID,
  MEMBERSHIP_PROVIDER_SLUG,
  MEMBERSHIP_PROVIDER_NAME,
  // 模型工具函数
  isMembershipModelId,
  extractMembershipModelId,
  buildMembershipModelId,
  // 等级配置
  TIER_DISPLAY_NAMES,
  TIER_COLORS,
  TIER_PRIORITY,
  compareTiers,
  isTierSufficient,
  // 错误处理
  AUTH_ERROR_MESSAGES,
  parseAuthError,
} from '@moryflow/shared-api'

// ── PC 端特有配置 ────────────────────────────────────────

/** 会员 API 基础 URL（支持环境变量覆盖） */
export const MEMBERSHIP_API_URL =
  (import.meta.env.VITE_MEMBERSHIP_API_URL as string) || MEMBERSHIP_API_URL_DEFAULT
