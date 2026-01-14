/**
 * Digest Topic DTO - Zod Schemas
 *
 * [INPUT]: 公开话题创建/更新/查询请求参数
 * [OUTPUT]: 验证后的话题配置
 * [POS]: Zod schemas + 推断类型
 */

import { z } from 'zod';
import { RedeliveryPolicySchema } from './subscription.schema';

// ========== 枚举 Schema ==========

export const DigestTopicVisibilitySchema = z.enum([
  'PUBLIC',
  'PRIVATE',
  'UNLISTED',
]);

export const DigestTopicStatusSchema = z.enum([
  'ACTIVE',
  'PAUSED_INSUFFICIENT_CREDITS',
  'PAUSED_BY_ADMIN',
]);

// ========== Slug 格式校验 ==========

const SlugSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'Slug must be lowercase alphanumeric with hyphens',
  );

// ========== 创建 Topic Schema ==========

export const CreateTopicSchema = z.object({
  // 从订阅发布
  subscriptionId: z.string(),

  // Topic 信息
  slug: SlugSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  visibility: DigestTopicVisibilitySchema.default('PUBLIC'),
});

// ========== 更新 Topic Schema ==========

export const UpdateTopicSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  visibility: DigestTopicVisibilitySchema.optional(),

  // 默认配置更新
  topic: z.string().min(1).max(500).optional(),
  interests: z.array(z.string().max(100)).max(20).optional(),
  searchLimit: z.number().int().min(1).max(100).optional(),
  scrapeLimit: z.number().int().min(0).max(100).optional(),
  minItems: z.number().int().min(1).max(30).optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  redeliveryPolicy: RedeliveryPolicySchema.optional(),
  redeliveryCooldownDays: z.number().int().min(1).max(30).optional(),

  // 调度
  cron: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(100).optional(),

  // 语言
  locale: z.string().max(10).optional(),
});

// ========== 公开 Topic 列表查询 Schema ==========

export const PublicTopicsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(['trending', 'latest', 'most_followed', 'quality'])
    .default('trending'),
  q: z.string().max(200).optional(), // 搜索
  locale: z.string().max(10).optional(),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) =>
      val === 'true' ? true : val === 'false' ? false : undefined,
    ),
});

// ========== Edition 列表查询 Schema ==========

export const EditionsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

// ========== Follow Topic Schema ==========

export const FollowTopicSchema = z.object({
  // 用户可调整的参数
  cron: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).max(100).optional(),
  minItems: z.number().int().min(1).max(30).optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  interests: z.array(z.string().max(100)).max(20).optional(), // 额外关键词
  languageMode: z.enum(['FOLLOW_UI', 'FIXED']).optional(),
  outputLocale: z.string().max(10).optional(),
});

// ========== 响应 Schema ==========

export const TopicResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: DigestTopicVisibilitySchema,
  status: DigestTopicStatusSchema,

  topic: z.string(),
  interests: z.array(z.string()),
  locale: z.string(),

  cron: z.string(),
  timezone: z.string(),

  subscriberCount: z.number(),
  lastEditionAt: z.date().nullable(),

  createdByUserId: z.string(),
  createdAt: z.date(),
});

export const EditionResponseSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  scheduledAt: z.date(),
  finishedAt: z.date().nullable(),
  outputLocale: z.string(),
  narrativeMarkdown: z.string().nullable(),
  itemCount: z.number(),
});

export const EditionItemResponseSchema = z.object({
  id: z.string(),
  rank: z.number(),
  scoreOverall: z.number(),
  titleSnapshot: z.string(),
  urlSnapshot: z.string(),
  aiSummarySnapshot: z.string().nullable(),
  siteName: z.string().nullable(),
  favicon: z.string().nullable(),
});

// ========== 推断类型 ==========

export type CreateTopicInput = z.infer<typeof CreateTopicSchema>;
export type UpdateTopicInput = z.infer<typeof UpdateTopicSchema>;
export type PublicTopicsQuery = z.infer<typeof PublicTopicsQuerySchema>;
export type EditionsQuery = z.infer<typeof EditionsQuerySchema>;
export type FollowTopicInput = z.infer<typeof FollowTopicSchema>;
export type TopicResponse = z.infer<typeof TopicResponseSchema>;
export type EditionResponse = z.infer<typeof EditionResponseSchema>;
export type EditionItemResponse = z.infer<typeof EditionItemResponseSchema>;
export type DigestTopicVisibility = z.infer<typeof DigestTopicVisibilitySchema>;
export type DigestTopicStatus = z.infer<typeof DigestTopicStatusSchema>;
