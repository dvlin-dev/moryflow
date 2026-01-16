/**
 * Digest Subscription DTO - Zod Schemas
 *
 * [INPUT]: 订阅创建/更新请求参数
 * [OUTPUT]: 验证后的订阅配置
 * [POS]: Zod schemas + 推断类型
 */

import { z } from 'zod';

const QueryBooleanSchema = z
  .enum(['true', 'false'])
  .transform((val) => val === 'true')
  .optional();

// ========== 枚举 Schema ==========

export const DigestToneSchema = z.enum(['neutral', 'opinionated', 'concise']);

export const DigestLanguageModeSchema = z.enum(['FOLLOW_UI', 'FIXED']);

export const RedeliveryPolicySchema = z.enum([
  'NEVER',
  'COOLDOWN',
  'ON_CONTENT_UPDATE',
]);

// ========== 创建订阅 Schema ==========

export const CreateSubscriptionSchema = z.object({
  name: z.string().min(1).max(100),

  // 用户输入
  topic: z.string().min(1).max(500),
  interests: z.array(z.string().max(100)).max(20).default([]),

  // 选题控制
  searchLimit: z.number().int().min(1).max(100).default(60),
  scrapeLimit: z.number().int().min(0).max(100).default(20),
  minItems: z.number().int().min(1).max(30).default(5),
  minScore: z.number().int().min(0).max(100).default(70),
  contentWindowHours: z.number().int().min(1).max(720).default(168),

  // 去重 & 二次投递
  redeliveryPolicy: RedeliveryPolicySchema.default('COOLDOWN'),
  redeliveryCooldownDays: z.number().int().min(1).max(30).default(7),

  // Follow 关联（可选）
  followedTopicId: z.string().optional(),

  // 调度
  cron: z.string().min(1).max(100),
  timezone: z.string().min(1).max(100).default('UTC'),

  // 输出语言
  languageMode: DigestLanguageModeSchema.default('FOLLOW_UI'),
  outputLocale: z.string().max(10).optional(),

  // 投递
  inboxEnabled: z.boolean().default(true),
  emailEnabled: z.boolean().default(false),
  emailTo: z.string().email().optional(),
  emailSubjectTemplate: z.string().max(200).optional(),
  webhookUrl: z.string().url().optional(),
  webhookEnabled: z.boolean().default(false),

  // AI & 写作偏好
  generateItemSummaries: z.boolean().default(true),
  composeNarrative: z.boolean().default(true),
  tone: DigestToneSchema.default('neutral'),

  enabled: z.boolean().default(true),
});

// ========== 更新订阅 Schema ==========

export const UpdateSubscriptionSchema = CreateSubscriptionSchema.partial();

// ========== 列表查询 Schema ==========

export const ListSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  enabled: QueryBooleanSchema,
  followedTopicId: z.string().optional(),
});

// ========== Admin 列表查询 Schema（page/limit） ==========

export const AdminListSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().optional(),
  enabled: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

// ========== 预览请求 Schema ==========

export const PreviewSubscriptionQuerySchema = z.object({
  /** 是否生成叙事稿（默认 false，节省成本） */
  includeNarrative: QueryBooleanSchema.default(false),
  /** 输出语言（默认 en） */
  locale: z.string().max(10).default('en'),
});

// ========== 预览响应 Schema ==========

export const PreviewItemSchema = z.object({
  title: z.string(),
  url: z.string(),
  aiSummary: z.string().optional(),
  scoreOverall: z.number(),
  scoringReason: z.string().optional(),
  rank: z.number(),
});

export const PreviewResponseSchema = z.object({
  items: z.array(PreviewItemSchema),
  narrative: z.string().optional(),
  stats: z.object({
    itemsCandidate: z.number(),
    itemsSelected: z.number(),
  }),
});

// ========== 推断类型 ==========

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;
export type ListSubscriptionsQuery = z.infer<
  typeof ListSubscriptionsQuerySchema
>;
export type AdminListSubscriptionsQuery = z.infer<
  typeof AdminListSubscriptionsQuerySchema
>;
export type PreviewSubscriptionQuery = z.infer<
  typeof PreviewSubscriptionQuerySchema
>;
export type PreviewItem = z.infer<typeof PreviewItemSchema>;
export type PreviewResponse = z.infer<typeof PreviewResponseSchema>;
export type DigestTone = z.infer<typeof DigestToneSchema>;
export type DigestLanguageMode = z.infer<typeof DigestLanguageModeSchema>;
export type RedeliveryPolicy = z.infer<typeof RedeliveryPolicySchema>;
