# Batch Scrape

> This folder structure changes require updating this document.

## Overview

Batch scraping API for processing multiple URLs in a single request. Creates async jobs that process URLs concurrently and aggregate results.

## 最近更新

- 错误响应统一为 RFC7807（移除 success/data 包装）

## Responsibilities

- Accept batch URL lists for scraping
- Create and manage batch jobs in database
- Queue individual URL processing via BullMQ
- Track progress and aggregate results
- Webhook notification on completion
- 幂等进度：以 Item 状态统计为准，避免重试导致计数偏差

## Constraints

- Public API uses ApiKeyGuard
- SSRF protection via UrlValidator (async DNS resolution)
- Quota deducted per batch job (each task costs 1)
- webhookUrl (if provided) must pass SSRF validation
- SSRF blocked URLs return 403

## 同步/异步模式

API 支持 `sync` 参数控制返回方式：

| sync 值 | 行为                                     | 返回类型                    | 超时默认值 |
| ------- | ---------------------------------------- | --------------------------- | ---------- |
| `true`  | **默认**：等待批量抓取完成后返回完整结果 | `BatchScrapeStatus`         | 10 分钟    |
| `false` | 立即返回任务 ID，客户端通过轮询获取结果  | `{ id, status, totalUrls }` | N/A        |

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
