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
import {
  CreateSessionSchema,
  OpenUrlSchema,
  SnapshotSchema,
  DeltaSnapshotSchema,
  ActionSchema,
  ScreenshotSchema,
  CreateWindowSchema,
  ConnectCdpSchema,
  SetInterceptRulesSchema,
  InterceptRuleSchema,
  ExportStorageSchema,
  ImportStorageSchema,
} from '../../browser/dto';
import { CreateAgentTaskSchema } from '../../agent/dto';

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
 * Console Browser 会话创建
 */
export const ConsoleBrowserSessionSchema =
  BaseConsolePlaygroundSchema.merge(CreateSessionSchema);
export type ConsoleBrowserSessionDto = z.infer<
  typeof ConsoleBrowserSessionSchema
>;

/**
 * Console Browser 打开 URL
 */
export const ConsoleBrowserOpenSchema =
  BaseConsolePlaygroundSchema.merge(OpenUrlSchema);
export type ConsoleBrowserOpenDto = z.infer<typeof ConsoleBrowserOpenSchema>;

/**
 * Console Browser 快照
 */
export const ConsoleBrowserSnapshotSchema =
  BaseConsolePlaygroundSchema.merge(SnapshotSchema);
export type ConsoleBrowserSnapshotDto = z.infer<
  typeof ConsoleBrowserSnapshotSchema
>;

/**
 * Console Browser 增量快照
 */
export const ConsoleBrowserDeltaSnapshotSchema =
  BaseConsolePlaygroundSchema.merge(DeltaSnapshotSchema);
export type ConsoleBrowserDeltaSnapshotDto = z.infer<
  typeof ConsoleBrowserDeltaSnapshotSchema
>;

/**
 * Console Browser Action
 */
export const ConsoleBrowserActionSchema =
  BaseConsolePlaygroundSchema.merge(ActionSchema);
export type ConsoleBrowserActionDto = z.infer<
  typeof ConsoleBrowserActionSchema
>;

/**
 * Console Browser Screenshot
 */
export const ConsoleBrowserScreenshotSchema =
  BaseConsolePlaygroundSchema.merge(ScreenshotSchema);
export type ConsoleBrowserScreenshotDto = z.infer<
  typeof ConsoleBrowserScreenshotSchema
>;

/**
 * Console Browser 创建窗口
 */
export const ConsoleBrowserCreateWindowSchema =
  BaseConsolePlaygroundSchema.merge(CreateWindowSchema);
export type ConsoleBrowserCreateWindowDto = z.infer<
  typeof ConsoleBrowserCreateWindowSchema
>;

/**
 * Console Browser CDP 连接
 */
export const ConsoleBrowserConnectCdpSchema =
  BaseConsolePlaygroundSchema.merge(ConnectCdpSchema);
export type ConsoleBrowserConnectCdpDto = z.infer<
  typeof ConsoleBrowserConnectCdpSchema
>;

/**
 * Console Browser 拦截规则（批量）
 */
export const ConsoleBrowserInterceptRulesSchema =
  BaseConsolePlaygroundSchema.merge(SetInterceptRulesSchema);
export type ConsoleBrowserInterceptRulesDto = z.infer<
  typeof ConsoleBrowserInterceptRulesSchema
>;

/**
 * Console Browser 拦截规则（单条）
 */
export const ConsoleBrowserInterceptRuleSchema =
  BaseConsolePlaygroundSchema.merge(InterceptRuleSchema);
export type ConsoleBrowserInterceptRuleDto = z.infer<
  typeof ConsoleBrowserInterceptRuleSchema
>;

/**
 * Console Browser 导出存储
 */
export const ConsoleBrowserExportStorageSchema =
  BaseConsolePlaygroundSchema.merge(ExportStorageSchema);
export type ConsoleBrowserExportStorageDto = z.infer<
  typeof ConsoleBrowserExportStorageSchema
>;

/**
 * Console Browser 导入存储
 */
export const ConsoleBrowserImportStorageSchema =
  BaseConsolePlaygroundSchema.merge(ImportStorageSchema);
export type ConsoleBrowserImportStorageDto = z.infer<
  typeof ConsoleBrowserImportStorageSchema
>;

/**
 * Console Agent 任务
 */
export const ConsoleAgentTaskSchema = BaseConsolePlaygroundSchema.merge(
  CreateAgentTaskSchema,
);
export type ConsoleAgentTaskDto = z.infer<typeof ConsoleAgentTaskSchema>;

/**
 * Query 参数中的 apiKeyId（用于 GET/DELETE 请求）
 */
export const ApiKeyIdQuerySchema = z.object({
  apiKeyId: z.string().cuid('Invalid API Key ID'),
});
export type ApiKeyIdQueryDto = z.infer<typeof ApiKeyIdQuerySchema>;

/**
 * Browser 网络历史 Query
 */
export const BrowserNetworkHistoryQuerySchema = ApiKeyIdQuerySchema.extend({
  limit: z.coerce.number().int().positive().optional(),
  urlFilter: z.string().max(1000).optional(),
});
export type BrowserNetworkHistoryQueryDto = z.infer<
  typeof BrowserNetworkHistoryQuerySchema
>;
