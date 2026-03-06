/**
 * [DEFINES]: subscriptions 编辑表单 schema 与表单值类型
 * [USED_BY]: SubscriptionEditDialog
 * [POS]: subscriptions 表单校验单一数据源（RHF + zod/v3）
 */

import { z } from 'zod/v3';
import { SUBSCRIPTION_STATUS_OPTIONS, SUBSCRIPTION_TIER_OPTIONS } from './constants';

export const subscriptionEditFormSchema = z.object({
  tier: z.enum(SUBSCRIPTION_TIER_OPTIONS),
  status: z.enum(SUBSCRIPTION_STATUS_OPTIONS),
});

export type SubscriptionEditFormValues = z.infer<typeof subscriptionEditFormSchema>;
