/**
 * BatchScrape module DTO definitions (Zod schemas)
 *
 * [INPUT]: BatchScrapeOptionsSchema - Request validation schema
 * [OUTPUT]: BatchScrapeOptions - Inferred type for validated requests
 * [POS]: Used by batch-scrape.controller.ts for request validation
 *
 * [PROTOCOL]: When this file changes, you MUST update this header and the directory CLAUDE.md
 */
// apps/server/src/batch-scrape/dto/batch-scrape.dto.ts
import { z } from 'zod';
import { ScrapeOptionsSchema } from '../../scraper/dto/scrape.dto';

// Batch Scrape request schema
export const BatchScrapeOptionsSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(100),
  scrapeOptions: ScrapeOptionsSchema.omit({ url: true }).optional(),
  webhookUrl: z.string().url().optional(),
});

export type BatchScrapeOptions = z.infer<typeof BatchScrapeOptionsSchema>;
