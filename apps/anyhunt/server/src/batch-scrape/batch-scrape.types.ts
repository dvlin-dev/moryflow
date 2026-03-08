/**
 * BatchScrape module type definitions
 *
 * [DEFINES]: BatchScrapeJobData, BatchScrapeItemResult, BatchScrapeStatus
 * [USED_BY]: batch-scrape.service.ts, batch-scrape.processor.ts
 * [POS]: Response types and internal data structures (not used for validation)
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

/**
 * Batch Scrape job data for queue
 */
export interface BatchScrapeJobData {
  batchJobId: string;
  options: Record<string, unknown>;
}

/**
 * Individual item result in batch scrape
 */
export interface BatchScrapeItemResult {
  url: string;
  status: string;
  result?: Record<string, unknown>;
  error?: string;
}

/**
 * Batch Scrape job status response
 */
export interface BatchScrapeStatus {
  id: string;
  status: string;
  totalUrls: number;
  completedUrls: number;
  failedUrls: number;
  createdAt: Date;
  completedAt?: Date;
  data?: BatchScrapeItemResult[];
}
