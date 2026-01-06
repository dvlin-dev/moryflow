// apps/server/src/map/dto/map.dto.ts
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
