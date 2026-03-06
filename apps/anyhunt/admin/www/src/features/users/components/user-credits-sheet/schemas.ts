/**
 * [DEFINES]: User credits 表单 schema 与默认值
 * [USED_BY]: UserCreditsSheet / GrantCreditsFormCard
 * [POS]: user credits 表单校验单一数据源
 */

import { z } from 'zod/v3';

export const grantCreditsFormSchema = z.object({
  amount: z.coerce.number().int().min(1).max(1_000_000),
  reason: z.string().min(1).max(500),
});

export type GrantCreditsFormValues = z.infer<typeof grantCreditsFormSchema>;

export const GRANT_CREDITS_DEFAULT_VALUES: GrantCreditsFormValues = {
  amount: 100,
  reason: '',
};
