/**
 * Console Playground DTO
 * 包装现有 API 的 Schema，添加 apiKeyId 字段
 *
 * [INPUT]: Console 前端请求
 * [OUTPUT]: 验证后的请求参数
 * [POS]: 供 console-playground.controller.ts 使用
 */

import { z } from 'zod';
import { ScrapeOptionsSchema } from '../../scraper/dto/scrape.dto';
import { CrawlOptionsSchema } from '../../crawler/dto/crawl.dto';
import { SearchOptionsSchema } from '../../search/dto/search.dto';
import { MapOptionsSchema } from '../../map/dto/map.dto';
import { ExtractOptionsSchema } from '../../extract/dto/extract.dto';

/**
 * 基础 Console Playground 请求 Schema
 * 所有请求都需要 apiKeyId
 */
const BaseConsolePlaygroundSchema = z.object({
  apiKeyId: z.string().cuid('Invalid API Key ID'),
});

/**
 * Console Scrape 请求
 */
export const ConsoleScrapeSchema =
  BaseConsolePlaygroundSchema.merge(ScrapeOptionsSchema);
export type ConsoleScrapeDto = z.infer<typeof ConsoleScrapeSchema>;

/**
 * Console Crawl 请求
 */
export const ConsoleCrawlSchema =
  BaseConsolePlaygroundSchema.merge(CrawlOptionsSchema);
export type ConsoleCrawlDto = z.infer<typeof ConsoleCrawlSchema>;

/**
 * Console Search 请求
 */
export const ConsoleSearchSchema =
  BaseConsolePlaygroundSchema.merge(SearchOptionsSchema);
export type ConsoleSearchDto = z.infer<typeof ConsoleSearchSchema>;

/**
 * Console Map 请求
 */
export const ConsoleMapSchema =
  BaseConsolePlaygroundSchema.merge(MapOptionsSchema);
export type ConsoleMapDto = z.infer<typeof ConsoleMapSchema>;

/**
 * Console Extract 请求
 */
export const ConsoleExtractSchema =
  BaseConsolePlaygroundSchema.merge(ExtractOptionsSchema);
export type ConsoleExtractDto = z.infer<typeof ConsoleExtractSchema>;

/**
 * Query 参数中的 apiKeyId（用于 GET/DELETE 请求）
 */
export const ApiKeyIdQuerySchema = z.object({
  apiKeyId: z.string().cuid('Invalid API Key ID'),
});
export type ApiKeyIdQueryDto = z.infer<typeof ApiKeyIdQuerySchema>;
