import { z } from 'zod';

/**
 * Demo screenshot request DTO
 */
export const demoScreenshotSchema = z.object({
  url: z.string().url('Invalid URL format'),
  captcha: z.string().optional(),
});

export type DemoScreenshotDto = z.infer<typeof demoScreenshotSchema>;

/**
 * Demo screenshot response DTO
 */
export interface DemoScreenshotResponse {
  /** Base64 data URL for the screenshot image */
  imageDataUrl: string;
  processingMs: number;
  fileSize?: number;
  width?: number;
  height?: number;
}

// ============== Scrape Demo ==============

export const demoScrapeSchema = z.object({
  url: z.string().url('Invalid URL format'),
  captcha: z.string().optional(),
  formats: z
    .array(
      z.enum(['markdown', 'html', 'rawHtml', 'links', 'screenshot', 'pdf']),
    )
    .default(['markdown']),
  onlyMainContent: z.boolean().default(true),
});

export type DemoScrapeDto = z.infer<typeof demoScrapeSchema>;

export interface DemoScrapeResponse {
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  screenshot?: {
    url?: string;
    base64?: string;
    width?: number;
    height?: number;
  };
  pdf?: {
    url: string;
    pageCount: number;
    fileSize: number;
  };
  metadata?: {
    title?: string;
    description?: string;
    ogImage?: string;
    favicon?: string;
  };
  processingMs: number;
  fromCache?: boolean;
}

// ============== Map Demo ==============

export const demoMapSchema = z.object({
  url: z.string().url('Invalid URL format'),
  captcha: z.string().optional(),
  search: z.string().optional(),
  includeSubdomains: z.boolean().default(false),
});

export type DemoMapDto = z.infer<typeof demoMapSchema>;

export interface DemoMapResponse {
  links: string[];
  count: number;
  processingMs: number;
}

// ============== Crawl Demo ==============

export const demoCrawlSchema = z.object({
  url: z.string().url('Invalid URL format'),
  captcha: z.string().optional(),
  maxDepth: z.number().min(1).max(2).default(1),
  limit: z.number().min(1).max(5).default(3),
});

export type DemoCrawlDto = z.infer<typeof demoCrawlSchema>;

export interface DemoCrawlPage {
  url: string;
  depth: number;
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

export interface DemoCrawlResponse {
  pages: DemoCrawlPage[];
  totalUrls: number;
  completedUrls: number;
  processingMs: number;
}

// ============== Extract Demo ==============

export const demoExtractSchema = z.object({
  url: z.string().url('Invalid URL format'),
  captcha: z.string().optional(),
  prompt: z.string().min(1, 'Prompt is required'),
  schema: z.record(z.string(), z.unknown()).optional(),
});

export type DemoExtractDto = z.infer<typeof demoExtractSchema>;

export interface DemoExtractResponse {
  data: unknown;
  processingMs: number;
}

// ============== Search Demo ==============

export const demoSearchSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  captcha: z.string().optional(),
  limit: z.number().min(1).max(10).default(5),
});

export type DemoSearchDto = z.infer<typeof demoSearchSchema>;

export interface DemoSearchResult {
  title: string;
  url: string;
  description?: string;
}

export interface DemoSearchResponse {
  results: DemoSearchResult[];
  query: string;
  processingMs: number;
}
