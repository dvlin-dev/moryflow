/**
 * [PROVIDES]: activateSubscriptionWithQuota, deactivateSubscriptionToFree
 * [DEPENDS]: Prisma.TransactionClient, TIER_MONTHLY_QUOTA, addOneMonth
 * [POS]: 订阅激活/降级的纯函数，供 PaymentService / AdminService / RedemptionService 复用
 */

import type { Prisma } from '../../generated/prisma-main/client';
import {
  SubscriptionTier,
  SubscriptionStatus,
} from '../../generated/prisma-main/client';
import { TIER_MONTHLY_QUOTA, addOneMonth } from './payment.constants';

export interface ActivateSubscriptionParams {
  userId: string;
  tier: SubscriptionTier;
  periodStart: Date;
  periodEnd: Date;
  creemCustomerId?: string;
  creemSubscriptionId?: string;
}

/**
 * Activate or upgrade a subscription and sync quota.
 * Resets monthlyUsed only when the billing period changes.
 * Creem fields use conditional spread — omitted fields won't overwrite existing values.
 */
export async function activateSubscriptionWithQuota(
  tx: Prisma.TransactionClient,
  params: ActivateSubscriptionParams,
): Promise<void> {
  const {
    userId,
    tier,
    periodStart,
    periodEnd,
    creemCustomerId,
    creemSubscriptionId,
  } = params;

  const existingSubscription = await tx.subscription.findUnique({
    where: { userId },
    select: {
      currentPeriodStart: true,
      currentPeriodEnd: true,
    },
  });

  const periodChanged =
    !existingSubscription?.currentPeriodStart ||
    !existingSubscription?.currentPeriodEnd ||
    existingSubscription.currentPeriodStart.getTime() !==
      periodStart.getTime() ||
    existingSubscription.currentPeriodEnd.getTime() !== periodEnd.getTime();

  await tx.subscription.upsert({
    where: { userId },
    create: {
      userId,
      tier,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      ...(creemCustomerId !== undefined && { creemCustomerId }),
      ...(creemSubscriptionId !== undefined && { creemSubscriptionId }),
    },
    update: {
      tier,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      ...(creemCustomerId !== undefined && { creemCustomerId }),
      ...(creemSubscriptionId !== undefined && { creemSubscriptionId }),
    },
  });

  const monthlyLimit = TIER_MONTHLY_QUOTA[tier];
  await tx.quota.upsert({
    where: { userId },
    create: {
      userId,
      monthlyLimit,
      monthlyUsed: 0,
      periodStartAt: periodStart,
      periodEndAt: periodEnd,
    },
    update: {
      monthlyLimit,
      ...(periodChanged ? { monthlyUsed: 0 } : {}),
      periodStartAt: periodStart,
      periodEndAt: periodEnd,
    },
  });
}

/**
 * Deactivate a subscription to FREE tier and reset quota.
 * Used when admin sets status to EXPIRED, or when a paid subscription period ends.
 */
export async function deactivateSubscriptionToFree(
  tx: Prisma.TransactionClient,
  params: { userId: string; status: SubscriptionStatus },
): Promise<void> {
  const { userId, status } = params;
  const now = new Date();
  const periodEnd = addOneMonth(now);

  await tx.subscription.upsert({
    where: { userId },
    create: {
      userId,
      tier: SubscriptionTier.FREE,
      status,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
    update: {
      tier: SubscriptionTier.FREE,
      status,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  await tx.quota.upsert({
    where: { userId },
    create: {
      userId,
      monthlyLimit: TIER_MONTHLY_QUOTA.FREE,
      monthlyUsed: 0,
      periodStartAt: now,
      periodEndAt: periodEnd,
    },
    update: {
      monthlyLimit: TIER_MONTHLY_QUOTA.FREE,
      monthlyUsed: 0,
      periodStartAt: now,
      periodEndAt: periodEnd,
    },
  });
}
