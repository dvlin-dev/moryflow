/**
 * [PROVIDES]: subscriptions 相关常量与展示映射
 * [DEPENDS]: SubscriptionTier/SubscriptionStatus 类型
 * [POS]: 供 subscriptions 页面与子组件复用，避免映射逻辑重复
 */

import type { SubscriptionStatus, SubscriptionTier } from './types';
import {
  getSubscriptionStatusBadgeVariant,
  getSubscriptionTierBadgeVariant,
} from '@/lib/subscription-badges';

export const SUBSCRIPTION_TIER_OPTIONS = [
  'FREE',
  'BASIC',
  'PRO',
  'TEAM',
] as const satisfies readonly SubscriptionTier[];
export const SUBSCRIPTION_STATUS_OPTIONS = [
  'ACTIVE',
  'CANCELED',
  'PAST_DUE',
  'EXPIRED',
] as const satisfies readonly SubscriptionStatus[];

export { getSubscriptionTierBadgeVariant, getSubscriptionStatusBadgeVariant };
