/**
 * Pagination Schemas
 * 通用分页查询参数验证
 */

import { z } from 'zod';

/**
 * 历史记录查询参数 schema
 * 用于 scrape/crawl/batch-scrape 等的历史查询
 */
export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type HistoryQuery = z.infer<typeof historyQuerySchema>;
