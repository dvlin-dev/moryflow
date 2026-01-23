/**
 * [PROVIDES]: Effective subscription tier computation
 * [DEPENDS]: SubscriptionTier, SubscriptionStatus
 * [POS]: Shared access-control helper for quota/rate-limit/feature gates
 *
 * [PROTOCOL]: When this file changes, update this header and src/common/CLAUDE.md
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
