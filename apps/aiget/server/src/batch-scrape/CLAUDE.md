# Batch Scrape

> This folder structure changes require updating this document.

## Overview

Batch scraping API for processing multiple URLs in a single request. Creates async jobs that process URLs concurrently and aggregate results.

## Responsibilities

- Accept batch URL lists for scraping
- Create and manage batch jobs in database
- Queue individual URL processing via BullMQ
- Track progress and aggregate results
- Webhook notification on completion

## Constraints

- Public API uses ApiKeyGuard
- SSRF protection via UrlValidator
- Quota deducted per URL processed
- Async job model (returns job ID immediately)

## File Structure

| File                         | Type       | Description                      |
| ---------------------------- | ---------- | -------------------------------- |
| `batch-scrape.service.ts`    | Service    | Job creation and status tracking |
| `batch-scrape.controller.ts` | Controller | Public API `/v1/batch-scrape`    |
| `batch-scrape.processor.ts`  | Processor  | BullMQ job processor             |
| `batch-scrape.module.ts`     | Module     | NestJS module definition         |
| `batch-scrape.types.ts`      | Types      | Status and result types          |
| `batch-scrape.errors.ts`     | Errors     | Custom exceptions                |
| `dto/batch-scrape.dto.ts`    | DTO        | Request/response schemas         |

## Batch Scrape Flow

```
POST /v1/batch-scrape
    ↓
Validate URLs (SSRF protection)
    ↓
Create BatchScrapeJob → Create BatchScrapeItems
    ↓
Queue 'batch-start' job → Return job ID
    ↓
Processor: For each URL
    └─ Call ScraperService → Save result
    ↓
Update job status → Trigger webhook
```

## Common Modification Scenarios

| Scenario           | Files to Modify                                      | Notes                |
| ------------------ | ---------------------------------------------------- | -------------------- |
| Add batch option   | `dto/batch-scrape.dto.ts`, `batch-scrape.service.ts` | Extend schema        |
| Change concurrency | `batch-scrape.processor.ts`                          | Update worker config |
| Add status field   | `batch-scrape.types.ts`, `batch-scrape.service.ts`   |                      |
| Add webhook event  | `batch-scrape.processor.ts`                          | Call WebhookService  |

## Dependencies

```
batch-scrape/
├── scraper/ - URL processing
├── prisma/ - Job storage (BatchScrapeJob, BatchScrapeItem)
├── queue/ - BullMQ integration
├── common/validators/ - SSRF protection
├── webhook/ - Completion notifications
└── api-key/ - Authentication
```

## Key Exports

```typescript
export { BatchScrapeModule } from './batch-scrape.module';
export { BatchScrapeService } from './batch-scrape.service';
```
