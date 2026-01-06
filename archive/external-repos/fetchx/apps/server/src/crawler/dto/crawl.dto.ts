/**
 * Crawler DTO - Zod Schemas
 *
 * [INPUT]: 爬取请求参数
 * [OUTPUT]: 验证后的爬取选项
 * [POS]: Zod schemas + 推断类型（用于验证）
 */

import { z } from 'zod';
import { ScrapeOptionsSchema } from '../../scraper/dto/scrape.dto';

// Crawl 请求 Schema
export const CrawlOptionsSchema = z.object({
  url: z.string().url(),
  maxDepth: z.number().int().min(1).max(10).default(3),
  limit: z.number().int().min(1).max(1000).default(100),
  includePaths: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional(),
  allowExternalLinks: z.boolean().default(false),
  scrapeOptions: ScrapeOptionsSchema.omit({ url: true }).optional(),
  webhookUrl: z.string().url().optional(),
});

export type CrawlOptions = z.infer<typeof CrawlOptionsSchema>;
