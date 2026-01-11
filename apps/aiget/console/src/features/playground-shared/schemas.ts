/**
 * Playground 表单 Zod Schemas
 * 用于 react-hook-form 表单验证
 *
 * 注意：
 * - 默认值由 useForm 的 defaultValues 提供，schema 只负责验证
 * - 使用 z.number() 而非 z.coerce.number()，因为 zod v4 的 coerce 会导致类型为 unknown
 *   表单字段应使用 valueAsNumber 处理数字输入
 */

import { z } from 'zod/v3'; // 使用 v3 兼容层，解决 @hookform/resolvers 类型兼容问题

// ========== Crawl Form Schema ==========
export const crawlFormSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  maxDepth: z.number().min(1).max(10),
  limit: z.number().min(1).max(100),
  includePaths: z.string(),
  excludePaths: z.string(),
  allowExternalLinks: z.boolean(),
});

export type CrawlFormValues = z.infer<typeof crawlFormSchema>;

// Crawl 表单默认值
export const crawlFormDefaults: CrawlFormValues = {
  url: '',
  maxDepth: 2,
  limit: 10,
  includePaths: '',
  excludePaths: '',
  allowExternalLinks: false,
};

// ========== Map Form Schema ==========
export const mapFormSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  search: z.string(),
  includeSubdomains: z.boolean(),
  limit: z.number().min(1).max(5000),
});

export type MapFormValues = z.infer<typeof mapFormSchema>;

// Map 表单默认值
export const mapFormDefaults: MapFormValues = {
  url: '',
  search: '',
  includeSubdomains: false,
  limit: 100,
};

// ========== Search Form Schema ==========
export const searchFormSchema = z.object({
  query: z.string().min(1, 'Please enter a search query'),
  limit: z.number().min(1).max(20),
});

export type SearchFormValues = z.infer<typeof searchFormSchema>;

// Search 表单默认值
export const searchFormDefaults: SearchFormValues = {
  query: '',
  limit: 5,
};

// ========== Extract Form Schema ==========
export const extractFormSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  prompt: z.string(),
  schemaText: z.string(),
});

export type ExtractFormValues = z.infer<typeof extractFormSchema>;

// Extract 表单默认值
export const extractFormDefaults: ExtractFormValues = {
  url: '',
  prompt: '',
  schemaText: '',
};

// ========== Scrape Form Schema ==========
export const scrapeFormSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  formats: z
    .array(z.enum(['markdown', 'html', 'rawHtml', 'links', 'screenshot', 'pdf']))
    .min(1, 'Select at least one format'),
  // Viewport
  device: z.enum(['desktop', 'tablet', 'mobile', 'custom']),
  width: z.number().min(100).max(3840),
  height: z.number().min(100).max(2160),
  mobile: z.boolean(),
  darkMode: z.boolean(),
  // Content
  onlyMainContent: z.boolean(),
  includeTags: z.string(),
  excludeTags: z.string(),
  // Wait
  waitFor: z.string(),
  timeout: z.number().min(1000).max(120000),
  // Screenshot
  screenshotFullPage: z.boolean(),
  screenshotFormat: z.enum(['png', 'jpeg', 'webp']),
  screenshotQuality: z.number().min(1).max(100),
  screenshotResponse: z.enum(['url', 'base64']),
});

export type ScrapeFormValues = z.infer<typeof scrapeFormSchema>;

// Scrape 表单默认值
export const scrapeFormDefaults: ScrapeFormValues = {
  url: '',
  formats: ['markdown'],
  device: 'desktop',
  width: 1280,
  height: 800,
  mobile: false,
  darkMode: false,
  onlyMainContent: true,
  includeTags: '',
  excludeTags: '',
  waitFor: '',
  timeout: 30000,
  screenshotFullPage: false,
  screenshotFormat: 'png',
  screenshotQuality: 80,
  screenshotResponse: 'url',
};
