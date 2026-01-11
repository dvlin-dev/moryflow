/**
 * Playground 表单 Zod Schemas
 * 用于 react-hook-form 表单验证
 */

import { z } from 'zod';

// ========== Crawl Form Schema ==========
export const crawlFormSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  maxDepth: z.coerce.number().min(1).max(10).default(2),
  limit: z.coerce.number().min(1).max(100).default(10),
  includePaths: z.string().default(''),
  excludePaths: z.string().default(''),
  allowExternalLinks: z.boolean().default(false),
});

export type CrawlFormValues = z.infer<typeof crawlFormSchema>;

// ========== Map Form Schema ==========
export const mapFormSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  search: z.string().default(''),
  includeSubdomains: z.boolean().default(false),
  limit: z.coerce.number().min(1).max(5000).default(100),
});

export type MapFormValues = z.infer<typeof mapFormSchema>;

// ========== Search Form Schema ==========
export const searchFormSchema = z.object({
  query: z.string().min(1, 'Please enter a search query'),
  limit: z.coerce.number().min(1).max(20).default(5),
});

export type SearchFormValues = z.infer<typeof searchFormSchema>;

// ========== Extract Form Schema ==========
export const extractFormSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  prompt: z.string().default(''),
  schemaText: z.string().default(''),
});

export type ExtractFormValues = z.infer<typeof extractFormSchema>;

// ========== Scrape Form Schema ==========
export const scrapeFormSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  formats: z
    .array(z.enum(['markdown', 'html', 'rawHtml', 'links', 'screenshot', 'pdf']))
    .min(1, 'Select at least one format'),
  // Viewport
  device: z.enum(['desktop', 'tablet', 'mobile', 'custom']).default('desktop'),
  width: z.coerce.number().min(100).max(3840).default(1280),
  height: z.coerce.number().min(100).max(2160).default(800),
  mobile: z.boolean().default(false),
  darkMode: z.boolean().default(false),
  // Content
  onlyMainContent: z.boolean().default(true),
  includeTags: z.string().default(''),
  excludeTags: z.string().default(''),
  // Wait
  waitFor: z.string().default(''),
  timeout: z.coerce.number().min(1000).max(120000).default(30000),
  // Screenshot
  screenshotFullPage: z.boolean().default(false),
  screenshotFormat: z.enum(['png', 'jpeg', 'webp']).default('png'),
  screenshotQuality: z.coerce.number().min(1).max(100).default(80),
  screenshotResponse: z.enum(['url', 'base64']).default('url'),
});

export type ScrapeFormValues = z.infer<typeof scrapeFormSchema>;
