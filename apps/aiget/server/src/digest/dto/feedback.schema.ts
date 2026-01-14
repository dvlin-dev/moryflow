/**
 * Digest Feedback DTO - Zod Schemas
 *
 * [INPUT]: 反馈学习请求参数
 * [OUTPUT]: 验证后的反馈配置
 * [POS]: Zod schemas + 推断类型
 */

import { z } from 'zod';

// ========== 反馈模式类型枚举 ==========

export const FeedbackPatternTypeSchema = z.enum([
  'KEYWORD',
  'DOMAIN',
  'AUTHOR',
]);

// ========== 获取建议响应 ==========

export const LearningSuggestionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'add_interest',
    'remove_interest',
    'add_negative',
    'adjust_score',
  ]),
  patternType: FeedbackPatternTypeSchema,
  value: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  positiveCount: z.number().int().min(0),
  negativeCount: z.number().int().min(0),
});

// ========== 应用建议请求 ==========

export const ApplySuggestionsSchema = z.object({
  /** 要应用的建议 ID 列表（格式：patternType:value，如 KEYWORD:ai） */
  suggestionIds: z.array(z.string()).min(1).max(50),
});

// ========== 获取反馈模式列表 ==========

export const GetPatternsQuerySchema = z.object({
  patternType: FeedbackPatternTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const FeedbackPatternSchema = z.object({
  id: z.string(),
  patternType: FeedbackPatternTypeSchema,
  value: z.string(),
  positiveCount: z.number().int().min(0),
  negativeCount: z.number().int().min(0),
  confidence: z.number().min(0).max(1),
  lastContentUrl: z.string().nullable(),
  lastTriggeredAt: z.date().nullable(),
  createdAt: z.date(),
});

// ========== 获取反馈统计 ==========

export const FeedbackStatsSchema = z.object({
  totalPositive: z.number().int().min(0),
  totalNegative: z.number().int().min(0),
  topPositiveTerms: z.array(
    z.object({
      value: z.string(),
      patternType: FeedbackPatternTypeSchema,
      count: z.number().int().min(0),
    }),
  ),
  topNegativeTerms: z.array(
    z.object({
      value: z.string(),
      patternType: FeedbackPatternTypeSchema,
      count: z.number().int().min(0),
    }),
  ),
});

// ========== 推断类型 ==========

export type FeedbackPatternType = z.infer<typeof FeedbackPatternTypeSchema>;
export type LearningSuggestionDto = z.infer<typeof LearningSuggestionSchema>;
export type ApplySuggestionsInput = z.infer<typeof ApplySuggestionsSchema>;
export type GetPatternsQuery = z.infer<typeof GetPatternsQuerySchema>;
export type FeedbackPatternDto = z.infer<typeof FeedbackPatternSchema>;
export type FeedbackStatsDto = z.infer<typeof FeedbackStatsSchema>;
