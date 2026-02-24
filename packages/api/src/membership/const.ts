/**
 * [PROVIDES]: membership 常量与工具函数
 * [DEPENDS]: membership/types.ts
 * [POS]: Moryflow 会员模型与展示配置
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { TierInfo, UserTier } from './types';

// ── 会员模型标识 ──────────────────────────────────────────

/** 会员模型 ID 前缀 */
export const MEMBERSHIP_MODEL_PREFIX = 'membership:';

/** 会员模型 Provider ID（用于设置页和模型选择器） */
export const MEMBERSHIP_PROVIDER_ID = '__membership__';

/** 会员模型 Provider Slug（用于图标等） */
export const MEMBERSHIP_PROVIDER_SLUG = 'membership';

/** 会员模型分组显示名称 */
export const MEMBERSHIP_PROVIDER_NAME = 'Membership Models';

// ── 会员模型工具函数 ──────────────────────────────────────

/** 判断是否是会员模型 ID */
export function isMembershipModelId(modelId: string | null | undefined): boolean {
  return !!modelId && modelId.startsWith(MEMBERSHIP_MODEL_PREFIX);
}

/** 从会员模型 ID 中提取实际模型 ID */
export function extractMembershipModelId(modelId: string): string {
  return modelId.replace(MEMBERSHIP_MODEL_PREFIX, '');
}

/** 构建会员模型 ID */
export function buildMembershipModelId(actualModelId: string): string {
  return `${MEMBERSHIP_MODEL_PREFIX}${actualModelId}`;
}

// ── 会员等级配置 ──────────────────────────────────────────

/** 会员等级显示名称 */
export const TIER_DISPLAY_NAMES: Record<UserTier, string> = {
  free: 'Free',
  starter: 'Starter',
  basic: 'Basic',
  pro: 'Pro',
  license: 'Lifetime',
};

/** 会员等级颜色（CSS class） */
export const TIER_COLORS: Record<UserTier, string> = {
  free: 'text-muted-foreground',
  starter: 'text-green-500',
  basic: 'text-blue-500',
  pro: 'text-purple-500',
  license: 'text-amber-500',
};

/** 会员等级详细信息配置 */
const TIER_INFO_CONFIG: Record<UserTier, TierInfo> = {
  free: {
    displayName: 'Free',
    features: ['Daily free credits', 'Basic AI models'],
    creditsPerMonth: 0,
  },
  starter: {
    displayName: 'Starter',
    features: [
      '5,000 credits per month',
      'Cloud sync',
      'Multi-device access',
      'Speech transcription',
      'Knowledge base',
      'Priority support',
    ],
    creditsPerMonth: 5000,
  },
  basic: {
    displayName: 'Basic',
    features: [
      '10,000 credits per month',
      'Cloud sync',
      'Multi-device access',
      'Speech transcription',
      'Knowledge base',
      'Priority support',
    ],
    creditsPerMonth: 10000,
  },
  pro: {
    displayName: 'Pro',
    features: [
      '20,000 credits per month',
      'Cloud sync',
      'Multi-device access',
      'Speech transcription',
      'Knowledge base',
      'Priority support',
    ],
    creditsPerMonth: 20000,
  },
  license: {
    displayName: 'Lifetime',
    features: ['Lifetime access', 'All AI models', 'Dedicated support', 'All advanced features'],
    creditsPerMonth: 0,
  },
};

/** 获取会员等级详细信息 */
export function getTierInfo(tier: UserTier): TierInfo {
  return TIER_INFO_CONFIG[tier];
}

// ── Better Auth 错误码映射 ────────────────────────────────

/** Better Auth 错误码英文映射 */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters.',
  PASSWORD_TOO_LONG: 'Password is too long.',
  WEAK_PASSWORD: 'Password must include uppercase, lowercase, and numbers.',
  INVALID_EMAIL: 'Invalid email format.',
  EMAIL_NOT_VERIFIED: 'Email not verified.',
  USER_ALREADY_EXISTS: 'Email is already registered.',
  USER_NOT_FOUND: 'User not found.',
  INVALID_PASSWORD: 'Incorrect password.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  TOO_MANY_REQUESTS: 'Too many requests. Please try again later.',
  SESSION_EXPIRED: 'Session expired. Please sign in again.',
  UNAUTHORIZED: 'Unauthorized.',
};

type AuthErrorLike = {
  code?: string;
  message?: string;
};

const parseJsonMessage = (message: string): AuthErrorLike | null => {
  const trimmed = message.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as AuthErrorLike;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const normalizeAuthError = (input: unknown): AuthErrorLike => {
  if (typeof input === 'string') {
    const parsed = parseJsonMessage(input);
    if (parsed) {
      return parsed;
    }
    return { message: input };
  }

  if (!input || typeof input !== 'object') {
    return {};
  }

  const direct = input as AuthErrorLike & { error?: unknown };
  if (direct.code || direct.message) {
    if (direct.message) {
      const parsed = parseJsonMessage(direct.message);
      if (parsed?.code || parsed?.message) {
        return {
          code: parsed.code || direct.code,
          message: parsed.message || direct.message,
        };
      }
    }
    return { code: direct.code, message: direct.message };
  }

  if (direct.error && typeof direct.error === 'object') {
    const nested = direct.error as AuthErrorLike;
    return { code: nested.code, message: nested.message };
  }

  return {};
};

/** 解析 Better Auth 错误为英文消息 */
export function parseAuthError(error: unknown): string {
  const normalized = normalizeAuthError(error);
  if (normalized.code && AUTH_ERROR_MESSAGES[normalized.code]) {
    return AUTH_ERROR_MESSAGES[normalized.code];
  }
  return normalized.message || 'Operation failed. Please try again.';
}
