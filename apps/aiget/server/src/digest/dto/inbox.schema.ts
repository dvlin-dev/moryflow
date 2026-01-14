/**
 * Digest Inbox DTO - Zod Schemas
 *
 * [INPUT]: Inbox 查询/操作请求参数
 * [OUTPUT]: 验证后的查询条件和操作
 * [POS]: Zod schemas + 推断类型
 */

import { z } from 'zod';

const QueryBooleanSchema = z
  .enum(['true', 'false'])
  .transform((val) => val === 'true')
  .optional();

// ========== Inbox 查询 Schema ==========

export const InboxQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),

  // 筛选
  subscriptionId: z.string().optional(),
  q: z.string().max(200).optional(), // 搜索：title/source
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  saved: QueryBooleanSchema,
  unread: QueryBooleanSchema,
  notInterested: QueryBooleanSchema,
});

// ========== Inbox 状态统计 Schema ==========

export const InboxStatsResponseSchema = z.object({
  unreadCount: z.number(),
  savedCount: z.number(),
  totalCount: z.number(),
});

// ========== Inbox Item 操作 Schema ==========

export const UpdateInboxItemSchema = z.object({
  action: z.enum([
    'markRead',
    'markUnread',
    'save',
    'unsave',
    'notInterested',
    'undoNotInterested',
  ]),
});

// ========== Inbox Item 响应 Schema ==========

export const InboxItemResponseSchema = z.object({
  id: z.string(),
  runId: z.string(),
  subscriptionId: z.string(),
  subscriptionName: z.string(),

  contentId: z.string(),
  canonicalUrlHash: z.string(),

  // 分数
  scoreRelevance: z.number(),
  scoreOverall: z.number(),
  scoringReason: z.string().nullable(),

  rank: z.number(),

  // 展示内容
  titleSnapshot: z.string(),
  urlSnapshot: z.string(),
  aiSummarySnapshot: z.string().nullable(),
  siteName: z.string().nullable(),
  favicon: z.string().nullable(),

  // 状态
  deliveredAt: z.date().nullable(),
  readAt: z.date().nullable(),
  savedAt: z.date().nullable(),
  notInterestedAt: z.date().nullable(),
});

// ========== 推断类型 ==========

export type InboxQuery = z.infer<typeof InboxQuerySchema>;
export type InboxStats = z.infer<typeof InboxStatsResponseSchema>;
export type UpdateInboxItemInput = z.infer<typeof UpdateInboxItemSchema>;
export type InboxItemResponse = z.infer<typeof InboxItemResponseSchema>;
