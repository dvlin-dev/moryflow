/**
 * [PROVIDES]: Effective subscription tier computation
 * [DEPENDS]: SubscriptionTier, SubscriptionStatus
 * [POS]: Shared access-control helper for quota/rate-limit/feature gates
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */
import type {
  SubscriptionTier,
  SubscriptionStatus,
} from '../../../generated/prisma-main/client';

export type SubscriptionSnapshot = {
  tier: SubscriptionTier | null;
  status: SubscriptionStatus | null;
};

export function getEffectiveSubscriptionTier(
  subscription: SubscriptionSnapshot | null | undefined,
  fallback: SubscriptionTier = 'FREE',
): SubscriptionTier {
  if (!subscription) return fallback;
  if (subscription.status !== 'ACTIVE') return fallback;
  return subscription.tier ?? fallback;
}
