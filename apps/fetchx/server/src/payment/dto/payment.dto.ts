/**
 * Payment DTO - Zod Schemas
 *
 * [INPUT]: Creem Webhook 负载
 * [OUTPUT]: 验证后的 Webhook 数据
 * [POS]: Zod schemas + 推断类型（用于验证）
 */

import { z } from 'zod';

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
  }),
});

/** Creem Webhook 负载类型 */
export type CreemWebhookPayload = z.infer<typeof CreemWebhookSchema>;
