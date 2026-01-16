/**
 * Playground 共享类型定义
 * 基于后端 Scrape API Schema
 */

// ========== 抓取格式 ==========
export type ScrapeFormat = 'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'pdf';

// ========== 截图选项 ==========
export interface ScreenshotOptions {
  fullPage?: boolean;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  clip?: string;
  response?: 'url' | 'base64';
}

// ========== PDF 选项 ==========
export interface PdfMargin {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface PdfOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  margin?: PdfMargin;
  scale?: number;
  printBackground?: boolean;
}

// ========== 视口设置 ==========
export interface Viewport {
  width: number;
  height: number;
}

export type DevicePreset = 'desktop' | 'tablet' | 'mobile';

// ========== 页面动作 ==========
export interface PageAction {
  type: 'click' | 'type' | 'scroll' | 'wait' | 'screenshot' | 'press';
  selector?: string;
  text?: string;
  key?: string;
  direction?: 'up' | 'down';
  amount?: number;
  milliseconds?: number;
}

// ========== Scrape 请求 ==========
export interface ScrapeRequest {
  url: string;
  formats?: ScrapeFormat[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  waitFor?: number | string;
  timeout?: number;
  headers?: Record<string, string>;
  viewport?: Viewport;
  mobile?: boolean;
  device?: DevicePreset;
  darkMode?: boolean;
  screenshotOptions?: ScreenshotOptions;
  pdfOptions?: PdfOptions;
  actions?: PageAction[];
}

// ========== Scrape 响应 ==========
export interface ScrapeTimings {
  queueWaitMs?: number;
  fetchMs?: number;
  renderMs?: number;
  transformMs?: number;
  screenshotMs?: number;
  totalMs?: number;
}

export interface ScreenshotResult {
  url?: string;
  base64?: string;
  width?: number;
  height?: number;
  format?: string;
  fileSize?: number;
  expiresAt?: string;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  author?: string;
  keywords?: string[];
  language?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
  ogSiteName?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  favicon?: string;
  canonicalUrl?: string;
  robots?: string;
}

// 同步完成响应（直接返回结果）
export interface ScrapeResultResponse {
  id: string;
  url: string;
  fromCache?: boolean;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  screenshot?: ScreenshotResult;
  pdf?: { url?: string; base64?: string };
  metadata?: PageMetadata;
  timings?: ScrapeTimings;
}

// 失败响应
export interface ScrapeErrorResponse {
  id: string;
  status: 'FAILED';
  error: { code: string; message: string };
}

// 统一类型
export type ScrapeResponse = ScrapeResultResponse | ScrapeErrorResponse;

// 类型守卫
export function isScrapeError(data: ScrapeResponse): data is ScrapeErrorResponse {
  return 'status' in data && data.status === 'FAILED';
}

// ========== Crawl 请求/响应 ==========
export interface CrawlRequest {
  url: string;
  maxDepth?: number;
  limit?: number;
  includePaths?: string[];
  excludePaths?: string[];
  allowExternalLinks?: boolean;
  scrapeOptions?: Omit<ScrapeRequest, 'url'>;
}

export interface CrawlPage {
  url: string;
  depth?: number;
  markdown?: string;
  html?: string;
  links?: string[];
  metadata?: Record<string, unknown>;
}

// 同步模式只返回 COMPLETED 或 FAILED
export interface CrawlResponse {
  id: string;
  status: 'COMPLETED' | 'FAILED';
  startUrl?: string;
  totalUrls?: number;
  completedUrls?: number;
  failedUrls?: number;
  createdAt?: string;
  completedAt?: string;
  data?: CrawlPage[];
  error?: { code: string; message: string };
}

// ========== Map 请求/响应 ==========
export interface MapRequest {
  url: string;
  search?: string;
  includeSubdomains?: boolean;
  limit?: number;
}

/**
 * Map 响应
 * 注意：apiClient 会自动解包 data，所以这里不包含 success 字段
 * 错误情况由 apiClient 抛出异常处理
 */
export interface MapResponse {
  links: string[];
}

// ========== Extract 请求/响应 ==========
export interface ExtractRequest {
  url: string;
  prompt?: string;
  schema?: Record<string, unknown>;
  scrapeOptions?: Omit<ScrapeRequest, 'url'>;
}

/**
 * Extract 响应
 * 注意：apiClient 会自动解包 data，所以这里不包含 success 字段
 * 错误情况由 apiClient 抛出异常处理
 */
export interface ExtractResponse {
  data: Record<string, unknown>;
}

// ========== Search 请求/响应 ==========
export interface SearchRequest {
  query: string;
  limit?: number;
  scrapeOptions?: Omit<ScrapeRequest, 'url'>;
}

export interface SearchResult {
  title: string;
  url: string;
  description?: string;
  markdown?: string;
  content?: string;
  engine?: string;
  score?: number;
  publishedDate?: string | null;
  thumbnail?: string;
}

/**
 * Search 响应
 * 注意：apiClient 会自动解包 data，所以这里不包含 success 字段
 * 错误情况由 apiClient 抛出异常处理
 */
export interface SearchResponse {
  query: string;
  numberOfResults: number;
  results: SearchResult[];
  suggestions?: string[];
}

// ========== 设备预设配置 ==========
export const DEVICE_PRESETS: Record<DevicePreset, Viewport> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};
