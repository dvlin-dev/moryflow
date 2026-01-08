/**
 * Crawler 模块类型定义
 *
 * [DEFINES]: CrawlJobData, FrontierOptions, CrawlPageResult, CrawlStatus
 * [USED_BY]: crawler.service.ts, crawler.processor.ts
 * [POS]: 响应类型和内部数据结构（不用于验证）
 */

// Crawl 任务数据
export interface CrawlJobData {
  crawlJobId: string;
}

// URL Frontier 配置
export interface FrontierOptions {
  crawlJobId: string;
  maxDepth: number;
  limit: number;
  includePaths: string[];
  excludePaths: string[];
  allowExternalLinks: boolean;
  baseHost: string;
}

// Crawl 页面结果
export interface CrawlPageResult {
  url: string;
  depth: number;
  markdown?: string;
  html?: string;
  metadata?: Record<string, unknown>;
  links?: string[];
  error?: string;
}

// Crawl 任务状态
export interface CrawlStatus {
  id: string;
  status: string;
  startUrl: string;
  totalUrls: number;
  completedUrls: number;
  failedUrls: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  data?: CrawlPageResult[];
}
