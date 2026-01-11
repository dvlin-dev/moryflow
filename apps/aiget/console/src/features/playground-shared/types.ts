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

export interface ScrapeResponse {
  id: string;
  url: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fromCache?: boolean;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  screenshot?: ScreenshotResult;
  pdf?: { url?: string; base64?: string };
  timings?: ScrapeTimings;
  error?: {
    code: string;
    message: string;
  };
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
  markdown?: string;
  html?: string;
  links?: string[];
}

export interface CrawlResponse {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  pagesScraped?: number;
  totalPages?: number;
  pages?: CrawlPage[];
  error?: {
    code: string;
    message: string;
  };
}

// ========== Map 请求/响应 ==========
export interface MapRequest {
  url: string;
  search?: string;
  includeSubdomains?: boolean;
  limit?: number;
}

export interface MapResponse {
  success: boolean;
  links?: string[];
  error?: {
    code: string;
    message: string;
  };
}

// ========== Extract 请求/响应 ==========
export interface ExtractRequest {
  url: string;
  prompt?: string;
  schema?: Record<string, unknown>;
  scrapeOptions?: Omit<ScrapeRequest, 'url'>;
}

export interface ExtractResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
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
}

export interface SearchResponse {
  success: boolean;
  results?: SearchResult[];
  error?: {
    code: string;
    message: string;
  };
}

// ========== 设备预设配置 ==========
export const DEVICE_PRESETS: Record<DevicePreset, Viewport> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};
