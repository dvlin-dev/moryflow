# Scraper

> This folder structure changes require updating this document.

## Overview

Core scraping engine for web content extraction. Handles single URL scraping with support for screenshots, markdown, HTML, links, and metadata.

## Responsibilities

- Browser-based page rendering via Playwright
- Content extraction (markdown, HTML, links, metadata)
- Screenshot capture with various options
- Wait strategies for dynamic content
- Action execution (click, scroll, type)
- PDF generation
- Cache management

## Constraints

- URL must pass SSRF validation before scraping
- 触发实际抓取前必须先扣费（通过 `BillingService` + `@BillingKey(...)`）
- Browser pool concurrency limits apply
- Cache hits don't consume quota

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
