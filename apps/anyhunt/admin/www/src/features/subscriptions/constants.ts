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

export const SUBSCRIPTION_TIER_OPTIONS: SubscriptionTier[] = ['FREE', 'BASIC', 'PRO', 'TEAM'];
export const SUBSCRIPTION_STATUS_OPTIONS: SubscriptionStatus[] = [
  'ACTIVE',
  'CANCELED',
  'PAST_DUE',
  'EXPIRED',
];

export { getSubscriptionTierBadgeVariant, getSubscriptionStatusBadgeVariant };
