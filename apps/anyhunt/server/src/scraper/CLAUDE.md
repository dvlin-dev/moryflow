# Scraper

> This folder structure changes require updating this document.

## Overview

Core scraping engine for web content extraction. Handles single URL scraping with support for screenshots, markdown, HTML, links, and metadata.

## 最近更新

- Scraper 错误响应统一为 RFC7807（移除 success/data 包装）

## Responsibilities

- Browser-based page rendering via Playwright
- Content extraction (markdown, HTML, links, metadata)
- Screenshot capture with various options
- Wait strategies for dynamic content
- Action execution (click, scroll, type)
- PDF generation
- Cache management

## Constraints

- URL must pass SSRF validation before scraping (async DNS resolution)
- 触发实际抓取前必须先扣费（通过 `BillingService` + `@BillingKey(...)`）
- Browser pool concurrency limits apply
- Cache hits don't consume quota
- 异步任务失败退费依赖 `ScrapeJob.quotaBreakdown`（按扣费交易分解，幂等）
- 套餐判断基于有效订阅（仅 ACTIVE 计入付费 tier）
- BrowserPool enforces network-level SSRF guard for sub-requests
- QueueEvents 仅用于同步等待，服务关闭时释放连接
- `headers` 仅用于运行时请求，不写入 `ScrapeJob.options`

## 同步/异步模式

API 支持 `sync` 参数控制返回方式（`syncTimeout` 控制同步等待上限）：

| sync 值 | 行为                                    | 返回类型         |
| ------- | --------------------------------------- | ---------------- |
| `true`  | **默认**：等待抓取完成后返回完整结果    | `ScrapeResult`   |
| `false` | 立即返回任务 ID，客户端通过轮询获取结果 | `{ id, status }` |

内部服务（如 Extract、Search、Crawler）使用 `scrapeSync()` 方法，强制同步模式且不扣费。

`syncTimeout` 用于控制同步等待上限（默认 120 秒），不影响页面加载超时（`timeout`）。

## File Structure

| File                    | Type       | Description                                |
| ----------------------- | ---------- | ------------------------------------------ |
| `scraper.service.ts`    | Service    | Core scraping logic, orchestrates handlers |
| `scraper.controller.ts` | Controller | Public API endpoint `/v1/scrape`           |
| `scraper.processor.ts`  | Processor  | BullMQ job processor for async scraping    |
| `scraper.module.ts`     | Module     | NestJS module definition                   |
| `scraper.constants.ts`  | Constants  | Timeout values, default options            |
| `scraper.errors.ts`     | Errors     | Custom exceptions (ScrapeError, etc.)      |
| `scraper.types.ts`      | Types      | External type definitions                  |
| `dto/scrape.dto.ts`     | DTO        | Request/Response Zod schemas               |

### Handlers

| File                                  | Description                            |
| ------------------------------------- | -------------------------------------- |
| `handlers/screenshot.handler.ts`      | Screenshot capture and processing      |
| `handlers/image-processor.ts`         | Image format conversion (Sharp)        |
| `handlers/action-executor.handler.ts` | Browser actions (click, scroll, type)  |
| `handlers/wait-strategy.handler.ts`   | Wait conditions for dynamic content    |
| `handlers/page-config.handler.ts`     | Page configuration (viewport, headers) |
| `handlers/pdf.handler.ts`             | PDF generation                         |

### Transformers

| File                                      | Description                 |
| ----------------------------------------- | --------------------------- |
| `transformers/markdown.transformer.ts`    | HTML to Markdown conversion |
| `transformers/links.transformer.ts`       | Link extraction             |
| `transformers/metadata.transformer.ts`    | Page metadata extraction    |
| `transformers/readability.transformer.ts` | Main content extraction     |

## Data Flow

```
Request → Validation → Cache Check → Quota Deduct → Browser Pool
    ↓
Page Load → Wait Strategy → Actions → Content Extract → Transform
    ↓
Response (markdown, screenshot, links, metadata)
```

## Common Modification Scenarios

| Scenario               | Files to Modify                           | Notes                               |
| ---------------------- | ----------------------------------------- | ----------------------------------- |
| Add new output format  | Create transformer in `transformers/`     | Export from `transformers/index.ts` |
| Add new browser action | `handlers/action-executor.handler.ts`     | Update action schema in DTO         |
| Change wait behavior   | `handlers/wait-strategy.handler.ts`       | Consider timeout limits             |
| Add screenshot option  | `handlers/screenshot.handler.ts`          | Update ScreenshotOptionsSchema      |
| Add new scrape option  | `dto/scrape.dto.ts`, `scraper.service.ts` | Zod schema + service logic          |

## Dependencies

```
scraper/
├── browser/ - Browser pool management
├── billing/ - Quota deduction/refund rules
├── storage/ - Screenshot storage (R2)
├── redis/ - Cache operations
└── common/ - URL validation, guards
```

## Key Exports

```typescript
export { ScraperModule } from './scraper.module';
export { ScraperService } from './scraper.service';
export { ScrapeRequestDto, ScrapeResponseDto } from './dto';
```
