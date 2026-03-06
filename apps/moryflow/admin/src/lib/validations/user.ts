/**
 * 用户管理相关的 Zod 验证模式
 */
import { z } from 'zod';

// 用户等级枚举
export const tierEnum = z.enum(['free', 'starter', 'basic', 'pro']);

// 积分类型枚举
export const creditTypeEnum = z.enum(['subscription', 'purchased']);

// 设置用户等级表单验证
export const setTierSchema = z.object({
  tier: tierEnum,
});

// 发放积分表单验证
export const grantCreditsSchema = z.object({
  type: creditTypeEnum,
  amount: z.number().min(1, '积分数量至少为 1'),
  expiresAt: z.date().optional(),
  reason: z.string().optional(),
});

export type SetTierFormData = z.infer<typeof setTierSchema>;
export type GrantCreditsFormData = z.infer<typeof grantCreditsSchema>;
