/**
 * BatchScrape module type definitions
 *
 * [DEFINES]: BatchScrapeJobData, BatchScrapeItemResult, BatchScrapeStatus
 * [USED_BY]: batch-scrape.service.ts, batch-scrape.processor.ts
 * [POS]: Response types and internal data structures (not used for validation)
 *
 * [PROTOCOL]: When this file changes, you MUST update this header and the directory CLAUDE.md
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
