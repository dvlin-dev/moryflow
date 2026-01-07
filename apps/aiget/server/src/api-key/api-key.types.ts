/**
 * API Key 模块类型定义
 */

import type { SubscriptionTier } from '../types/tier.types';

/** API Key 验证结果（用于 Guard 和公开 API） */
export interface ApiKeyValidationResult {
  id: string;
  userId: string;
  name: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    tier: SubscriptionTier;
    isAdmin: boolean;
  };
}

/** API Key 创建结果（包含完整密钥，仅创建时返回） */
export interface ApiKeyCreateResult {
  key: string;
  id: string;
  name: string;
  keyPrefix: string;
}

/** API Key 列表项 */
export interface ApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}
