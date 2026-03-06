/**
 * Admin Payment DTOs
 */

import { z } from 'zod';

// ==================== Constants ====================

const PAGINATION_MAX_LIMIT = 100;
const PAGINATION_DEFAULT_LIMIT = 50;

// ==================== Subscription DTOs ====================

/**
 * 取消订阅请求参数
 */
export const CancelSubscriptionSchema = z.object({
  /** 是否在当前周期结束后取消（true = 立即停止续费但保留至周期结束） */
  cancelAtPeriodEnd: z.boolean().optional().default(true),
});

export type CancelSubscriptionDto = z.infer<typeof CancelSubscriptionSchema>;

// ==================== Query DTOs ====================

/** 订阅状态枚举 */
const SubscriptionStatusEnum = z.enum([
  'active',
  'canceled',
  'paused',
  'past_due',
  'trialing',
  'unpaid',
]);

/** 支付状态枚举 */
const PaymentStatusEnum = z.enum([
  'pending',
  'completed',
  'failed',
  'refunded',
  'canceled',
]);

/** 产品类型枚举 */
const ProductTypeEnum = z.enum(['subscription', 'credits']);

/**
 * 订阅查询参数 - M1 Fix: 使用枚举验证替代类型断言
 */
export const SubscriptionQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : PAGINATION_DEFAULT_LIMIT;
      return Math.min(Math.max(n, 1), PAGINATION_MAX_LIMIT);
    }),
  offset: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 0;
      return Math.max(n, 0);
    }),
  status: SubscriptionStatusEnum.optional(),
});

export type SubscriptionQueryDto = z.infer<typeof SubscriptionQuerySchema>;

/**
 * 订单查询参数 - M1 Fix: 使用枚举验证替代类型断言
 */
export const OrderQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : PAGINATION_DEFAULT_LIMIT;
      return Math.min(Math.max(n, 1), PAGINATION_MAX_LIMIT);
    }),
  offset: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 0;
      return Math.max(n, 0);
    }),
  status: PaymentStatusEnum.optional(),
  productType: ProductTypeEnum.optional(),
});

export type OrderQueryDto = z.infer<typeof OrderQuerySchema>;

/**
 * 通用分页查询参数 (带上限保护)
 */
export const PaginationQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : PAGINATION_DEFAULT_LIMIT;
      return Math.min(Math.max(n, 1), PAGINATION_MAX_LIMIT);
    }),
  offset: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 0;
      return Math.max(n, 0);
    }),
});

export type PaginationQueryDto = z.infer<typeof PaginationQuerySchema>;

// ==================== Test Checkout DTOs ====================

/**
 * 测试 Checkout 请求参数
 * 仅在 CREEM_TEST_MODE=true 时可用
 */
export const TestCheckoutSchema = z.object({
  /** 产品环境变量 key，如 CREEM_PRODUCT_BASIC_MONTHLY */
  productEnvKey: z.string().min(1, 'productEnvKey is required'),
  /** 测试用户 ID */
  testUserId: z.string().min(1, 'testUserId is required'),
  /** 支付成功后跳转 URL */
  successUrl: z.string().url('successUrl must be a valid URL'),
  /** 支付取消后跳转 URL（可选） */
  cancelUrl: z.string().url('cancelUrl must be a valid URL').optional(),
});

export type TestCheckoutDto = z.infer<typeof TestCheckoutSchema>;
