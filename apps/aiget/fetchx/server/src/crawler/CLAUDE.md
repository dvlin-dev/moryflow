# Crawler

> This folder structure changes require updating this document.

## Overview

Multi-page crawling engine for extracting content from entire websites. Uses async job processing to handle large crawl operations.

## Responsibilities

- Crawl websites starting from a URL
- Discover and follow links within site
- Queue and process pages via BullMQ
- Aggregate results from multiple pages
- Respect crawl limits and depth

## Constraints

- Async operation (returns job ID)
- Maximum pages limit per crawl
- Maximum depth limit
- Same-domain links only (unless configured)
- Uses Map module for URL discovery

## File Structure

| File                    | Type       | Description                         |
| ----------------------- | ---------- | ----------------------------------- |
| `crawler.service.ts`    | Service    | Crawl job management, orchestration |
| `crawler.controller.ts` | Controller | Public API `/v1/crawl`              |
| `crawler.processor.ts`  | Processor  | BullMQ job processor                |
| `crawler.module.ts`     | Module     | NestJS module definition            |
| `crawler.errors.ts`     | Errors     | CrawlError, CrawlLimitError         |
| `crawler.types.ts`      | Types      | CrawlJob, CrawlResult types         |
| `url-frontier.ts`       | Utility    | URL queue management                |
| `dto/crawl.dto.ts`      | DTO        | Request/Response schemas            |

## Crawl Flow

```
POST /v1/crawl { url, limit, depth }
    ↓
Create Async Job → Return job ID
    ↓
Job Processor:
    Map Site URLs → Filter by rules
    ↓
    Queue Scrape Jobs (parallel)
    ↓
    Aggregate Results
    ↓
    Webhook Notification (if configured)
```

## Job Status

```typescript
type CrawlStatus =
  | 'pending' // Job created, waiting
  | 'running' // Actively crawling
  | 'completed' // All pages scraped
  | 'failed' // Error occurred
  | 'cancelled'; // User cancelled
```

## Common Modification Scenarios

| Scenario              | Files to Modify                          | Notes               |
| --------------------- | ---------------------------------------- | ------------------- |
| Add crawl filter      | `crawler.service.ts`, `url-frontier.ts`  | URL filtering logic |
| Change queue strategy | `crawler.processor.ts`                   | BullMQ job options  |
| Add result format     | `crawler.types.ts`, `crawler.service.ts` | Extend CrawlResult  |
| Add progress tracking | `crawler.processor.ts`                   | Update job progress |

## Key Methods

```typescript
// Start crawl job
const job = await crawlerService.crawl(url, options);

// Get job status
const status = await crawlerService.getStatus(jobId);

// Cancel crawl
await crawlerService.cancel(jobId);

// Get results (when completed)
const results = await crawlerService.getResults(jobId);
```

## Dependencies

```
crawler/
├── map/ - URL discovery
├── scraper/ - Page content extraction
├── queue/ - BullMQ job queue
├── quota/ - Quota per page scraped
├── webhook/ - Completion notification
└── redis/ - Job state storage
```

## Key Exports

```typescript
export { CrawlerModule } from './crawler.module';
export { CrawlerService } from './crawler.service';
export { CrawlRequestDto, CrawlResponseDto } from './dto';
export type { CrawlJob, CrawlResult } from './crawler.types';
```
