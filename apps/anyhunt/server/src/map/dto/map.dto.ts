/**
 * Map DTO - Zod Schemas
 *
 * [INPUT]: Map 请求参数验证
 * [OUTPUT]: MapOptions/MapResult 类型定义
 * [POS]: Map 模块请求/响应 schema 与类型
 *
 * [PROTOCOL]: When this file changes, you MUST update this header and the directory CLAUDE.md
 */
import { z } from 'zod';

// Map 请求 Schema
export const MapOptionsSchema = z.object({
  url: z.string().url(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(10000).default(5000),
  ignoreSitemap: z.boolean().default(false),
  includeSubdomains: z.boolean().default(false),
});

export type MapOptions = z.infer<typeof MapOptionsSchema>;

// Sitemap 条目
export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

// Map 结果
export interface MapResult {
  links: string[];
  count: number;
}
