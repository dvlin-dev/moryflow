/**
 * Scraper 模块类型定义
 *
 * [DEFINES]: PageMetadata, ScreenshotResult, PdfResult, ScrapeResult, ScrapeJobData
 * [USED_BY]: scraper.service.ts, scraper.controller.ts
 * [POS]: 响应类型和内部数据结构（不用于验证）
 */

import type { ScrapeOptions } from './dto/scrape.dto';

// 页面元数据
export interface PageMetadata {
  title?: string;
  description?: string;
  author?: string;
  keywords?: string[];
  language?: string;
  publishedTime?: string;
  modifiedTime?: string;
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

// 截图结果
export interface ScreenshotResult {
  url?: string;
  base64?: string;
  width: number;
  height: number;
  format: string;
  fileSize: number;
  expiresAt?: Date;
}

// PDF 结果（仅 URL，不支持 base64）
export interface PdfResult {
  url: string;
  pageCount: number;
  fileSize: number;
  expiresAt: Date;
}

// 抓取结果
export interface ScrapeResult {
  id: string;
  url: string;
  fromCache: boolean;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  metadata?: PageMetadata;
  screenshot?: ScreenshotResult;
  pdf?: PdfResult;
  timings?: {
    queueWaitMs: number;
    fetchMs: number;
    renderMs: number;
    transformMs: number;
    screenshotMs?: number;
    pdfMs?: number;
    totalMs: number;
  };
}

// BullMQ 任务数据
export interface ScrapeJobData {
  jobId: string;
  userId: string;
  url: string;
  options: ScrapeOptions;
  tier: string;
}
