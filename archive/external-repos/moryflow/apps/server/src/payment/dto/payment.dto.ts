/**
 * Payment DTOs
 * 支付相关的请求和响应数据结构
 *
 * [DEFINES]: Payment webhook and params schemas
 * [USED_BY]: PaymentController, PaymentService
 */

import { z } from 'zod';

// ==================== Webhook Schemas ====================

/**
 * Creem Webhook 负载 Schema
 * 根据 Creem 官方文档: https://docs.creem.io/code/webhooks
 */
export const CreemWebhookSchema = z.object({
  id: z.string().min(1),
  eventType: z.string().min(1),
  created_at: z.number(),
  object: z.object({
    id: z.string().min(1),
    product: z
      .object({ id: z.string().min(1) })
      .passthrough()
      .optional(),
    customer: z
      .object({
        id: z.string().min(1),
        email: z.string().optional(),
      })
      .passthrough()
      .optional(),
    // checkout.completed 事件中的 subscription 是嵌套对象
    subscription: z
      .union([z.string(), z.object({ id: z.string().min(1) }).passthrough()])
      .optional(),
    order: z
      .object({
        id: z.string().min(1),
        amount: z.number().int().nonnegative(),
        currency: z.string().min(1),
      })
      .passthrough()
      .optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    current_period_start_date: z.string().optional(),
    current_period_end_date: z.string().optional(),
    license_key: z.string().optional(),
  }),
});

export type CreemWebhookPayload = z.infer<typeof CreemWebhookSchema>;

// ==================== Subscription Schemas ====================

/**
 * 订阅激活参数
 */
export const SubscriptionActiveParamsSchema = z.object({
  subscriptionId: z.string(),
  customerId: z.string(),
  productId: z.string(),
  userId: z.string(),
  periodEnd: z.date(),
});

export type SubscriptionActiveParams = z.infer<
  typeof SubscriptionActiveParamsSchema
>;

/**
 * 订阅取消参数
 */
export const SubscriptionCanceledParamsSchema = z.object({
  subscriptionId: z.string(),
  userId: z.string(),
});

export type SubscriptionCanceledParams = z.infer<
  typeof SubscriptionCanceledParamsSchema
>;

/**
 * 订阅暂停参数
 */
export const SubscriptionPausedParamsSchema = z.object({
  subscriptionId: z.string(),
});

export type SubscriptionPausedParams = z.infer<
  typeof SubscriptionPausedParamsSchema
>;

// ==================== Checkout Schemas ====================

/**
 * 产品类型
 */
export const ProductTypeSchema = z.enum(['credits', 'license']);
export type ProductType = z.infer<typeof ProductTypeSchema>;

/**
 * 结账完成参数
 */
export const CheckoutCompletedParamsSchema = z.object({
  checkoutId: z.string(),
  orderId: z.string(),
  productId: z.string(),
  userId: z.string(),
  amount: z.number(),
  currency: z.string(),
  productType: ProductTypeSchema,
  licenseKey: z.string().optional(),
});

export type CheckoutCompletedParams = z.infer<
  typeof CheckoutCompletedParamsSchema
>;
