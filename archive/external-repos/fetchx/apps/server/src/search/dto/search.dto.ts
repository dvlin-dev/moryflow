/**
 * Search request validation schemas
 *
 * [INPUT]: Raw request body from clients
 * [OUTPUT]: Validated SearchOptions type
 * [POS]: Used by search.controller.ts for request validation
 *
 * [PROTOCOL]: When this file changes, you MUST update this header and the directory CLAUDE.md
 */

import { z } from 'zod';
import { ScrapeOptionsSchema } from '../../scraper/dto/scrape.dto';

/**
 * Search category
 */
export const SearchCategorySchema = z.enum([
  'general',
  'images',
  'news',
  'videos',
  'music',
  'files',
  'it',
  'science',
  'social media',
]);

export type SearchCategory = z.infer<typeof SearchCategorySchema>;

/**
 * Time range
 */
export const TimeRangeSchema = z.enum(['day', 'week', 'month', 'year']);

export type TimeRange = z.infer<typeof TimeRangeSchema>;

/**
 * Safe search level
 */
export const SafeSearchSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
]);

export type SafeSearch = z.infer<typeof SafeSearchSchema>;

/**
 * Search request parameters schema
 */
export const SearchOptionsSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).default(10),
  categories: z.array(SearchCategorySchema).optional(),
  engines: z.array(z.string()).optional(),
  language: z.string().optional(),
  timeRange: TimeRangeSchema.optional(),
  safeSearch: SafeSearchSchema.optional(),
  scrapeResults: z.boolean().default(false),
  scrapeOptions: ScrapeOptionsSchema.omit({ url: true }).optional(),
});

export type SearchOptions = z.infer<typeof SearchOptionsSchema>;
