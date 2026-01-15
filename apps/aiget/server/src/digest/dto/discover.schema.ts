/**
 * Discover DTO - Zod Schemas
 *
 * [INPUT]: Discover Feed 查询参数
 * [OUTPUT]: Feed 内容、Featured/Trending Topics
 * [POS]: Discover 模块的请求/响应 Schema
 */

import { z } from 'zod';

// ========== 查询 Schema ==========

export const DiscoverFeedQuerySchema = z.object({
  type: z.enum(['featured', 'trending']).default('featured'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const DiscoverTopicsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

// ========== 响应 Schema ==========

export const DiscoverTopicSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  subscriberCount: z.number(),
});

export const DiscoverFeedItemSchema = z.object({
  // 内容
  id: z.string(),
  title: z.string(),
  url: z.string(),
  aiSummary: z.string().nullable(),
  siteName: z.string().nullable(),
  favicon: z.string().nullable(),
  scoreOverall: z.number(),

  // Topic 上下文
  topic: DiscoverTopicSchema,

  // Edition 上下文
  editionId: z.string(),
  editionAt: z.date(),
});

export const DiscoverFeedResponseSchema = z.object({
  items: z.array(DiscoverFeedItemSchema),
  generatedAt: z.date(),
});

export const DiscoverTopicItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  subscriberCount: z.number(),
  lastEditionAt: z.date().nullable(),
});

export const DiscoverTrendingTopicItemSchema = DiscoverTopicItemSchema.extend({
  trendingScore: z.number(),
});

export const DiscoverFeaturedTopicsResponseSchema = z.object({
  items: z.array(DiscoverTopicItemSchema),
});

export const DiscoverTrendingTopicsResponseSchema = z.object({
  items: z.array(DiscoverTrendingTopicItemSchema),
});

// ========== 推断类型 ==========

export type DiscoverFeedQuery = z.infer<typeof DiscoverFeedQuerySchema>;
export type DiscoverTopicsQuery = z.infer<typeof DiscoverTopicsQuerySchema>;
export type DiscoverFeedItem = z.infer<typeof DiscoverFeedItemSchema>;
export type DiscoverFeedResponse = z.infer<typeof DiscoverFeedResponseSchema>;
export type DiscoverTopicItem = z.infer<typeof DiscoverTopicItemSchema>;
export type DiscoverTrendingTopicItem = z.infer<
  typeof DiscoverTrendingTopicItemSchema
>;
