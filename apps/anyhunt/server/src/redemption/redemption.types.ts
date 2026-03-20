import type { SubscriptionTier } from '../../generated/prisma-main/client';

export interface RedeemResult {
  type: 'CREDITS' | 'MEMBERSHIP';
  creditsAmount?: number;
  membershipTier?: SubscriptionTier;
  membershipDays?: number;
}
