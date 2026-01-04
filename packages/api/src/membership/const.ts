/**
 * Membership 常量定义
 *
 * 会员系统相关的常量和工具函数，供 PC 和 Mobile 共用
 */

import type { TierInfo, UserTier } from './types'

// ── 会员模型标识 ──────────────────────────────────────────

/** 会员模型 ID 前缀 */
export const MEMBERSHIP_MODEL_PREFIX = 'membership:'

/** 会员模型 Provider ID（用于设置页和模型选择器） */
export const MEMBERSHIP_PROVIDER_ID = '__membership__'

/** 会员模型 Provider Slug（用于图标等） */
export const MEMBERSHIP_PROVIDER_SLUG = 'membership'

/** 会员模型分组显示名称 */
export const MEMBERSHIP_PROVIDER_NAME = '会员模型'

// ── 会员模型工具函数 ──────────────────────────────────────

/** 判断是否是会员模型 ID */
export function isMembershipModelId(modelId: string | null | undefined): boolean {
  return !!modelId && modelId.startsWith(MEMBERSHIP_MODEL_PREFIX)
}

/** 从会员模型 ID 中提取实际模型 ID */
export function extractMembershipModelId(modelId: string): string {
  return modelId.replace(MEMBERSHIP_MODEL_PREFIX, '')
}

/** 构建会员模型 ID */
export function buildMembershipModelId(actualModelId: string): string {
  return `${MEMBERSHIP_MODEL_PREFIX}${actualModelId}`
}

// ── 会员等级配置 ──────────────────────────────────────────

/** 会员等级显示名称 */
export const TIER_DISPLAY_NAMES: Record<string, string> = {
  free: '免费用户',
  starter: '入门会员',
  basic: '基础会员',
  pro: '专业会员',
  license: '永久授权',
}

/** 会员等级颜色（CSS class） */
export const TIER_COLORS: Record<string, string> = {
  free: 'text-muted-foreground',
  starter: 'text-green-500',
  basic: 'text-blue-500',
  pro: 'text-purple-500',
  license: 'text-amber-500',
}

/** 会员等级优先级（用于比较） */
export const TIER_PRIORITY: Record<string, number> = {
  free: 0,
  starter: 1,
  basic: 2,
  pro: 3,
  license: 4,
}

/** 会员等级详细信息配置 */
export const TIER_INFO_CONFIG: Record<UserTier, TierInfo> = {
  free: {
    displayName: '免费用户',
    features: ['每日免费积分', '基础 AI 模型'],
    creditsPerMonth: 0,
  },
  starter: {
    displayName: '入门会员',
    features: ['每月 5,000 积分', '云端数据同步', '多端使用', '语音转写', '知识库功能', '优先客服支持'],
    creditsPerMonth: 5000,
  },
  basic: {
    displayName: '基础会员',
    features: ['每月 10,000 积分', '云端数据同步', '多端使用', '语音转写', '知识库功能', '优先客服支持'],
    creditsPerMonth: 10000,
  },
  pro: {
    displayName: '专业会员',
    features: ['每月 20,000 积分', '云端数据同步', '多端使用', '语音转写', '知识库功能', '优先客服支持'],
    creditsPerMonth: 20000,
  },
  license: {
    displayName: '永久授权',
    features: ['永久使用', '所有 AI 模型', '专属支持', '所有高级功能'],
    creditsPerMonth: 0,
  },
}

/** 比较两个等级，返回 -1/0/1 */
export function compareTiers(a: string, b: string): number {
  const priorityA = TIER_PRIORITY[a] ?? 0
  const priorityB = TIER_PRIORITY[b] ?? 0
  return priorityA - priorityB
}

/** 检查用户等级是否满足要求 */
export function isTierSufficient(userTier: string, requiredTier: string): boolean {
  return compareTiers(userTier, requiredTier) >= 0
}

/** 获取会员等级详细信息 */
export function getTierInfo(tier: UserTier): TierInfo {
  return TIER_INFO_CONFIG[tier]
}

// ── Better Auth 错误码映射 ────────────────────────────────

/** Better Auth 错误码中文映射 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  PASSWORD_TOO_SHORT: '密码太短，至少需要 8 个字符',
  PASSWORD_TOO_LONG: '密码太长',
  WEAK_PASSWORD: '密码强度不够，需要包含大小写字母和数字',
  INVALID_EMAIL: '邮箱格式不正确',
  EMAIL_NOT_VERIFIED: '邮箱未验证',
  USER_ALREADY_EXISTS: '该邮箱已被注册',
  USER_NOT_FOUND: '用户不存在',
  INVALID_PASSWORD: '密码错误',
  INVALID_CREDENTIALS: '邮箱或密码错误',
  TOO_MANY_REQUESTS: '请求过于频繁，请稍后再试',
  SESSION_EXPIRED: '登录已过期，请重新登录',
  UNAUTHORIZED: '未授权',
}

/** 解析 Better Auth 错误为中文消息 */
export function parseAuthError(error: { code?: string; message?: string }): string {
  if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code]
  }
  return error.message || '操作失败，请重试'
}
