# Extract

> This folder structure changes require updating this document.

## Overview

AI-powered structured data extraction API. Scrapes web pages and uses LLM to extract structured data according to a user-defined JSON Schema.

## Responsibilities

- Scrape pages and extract content
- Call LLM with user prompt and schema
- Parse and validate structured output
- Support multiple URLs with concurrency

## Constraints

- Public API uses ApiKeyGuard
- Requires LLM API key (OpenAI-compatible)
- Quota deducted per URL processed
- Synchronous processing (no job queue)

## File Structure

| File                    | Type       | Description                          |
| ----------------------- | ---------- | ------------------------------------ |
| `extract.service.ts`    | Service    | Orchestrates scrape + LLM extraction |
| `extract.controller.ts` | Controller | Public API `/v1/extract`             |
| `extract.module.ts`     | Module     | NestJS module definition             |
| `extract.types.ts`      | Types      | Result types                         |
| `extract.errors.ts`     | Errors     | Custom exceptions                    |
| `llm.client.ts`         | Client     | LLM API wrapper (OpenAI-compatible)  |
| `dto/extract.dto.ts`    | DTO        | Request/response schemas             |

## Extract Flow

```
POST /v1/extract { urls, prompt, schema }
    ↓
For each URL (concurrent):
    ├─ Scrape page (markdown)
    ├─ Build prompt with content
    └─ Call LLM with Zod schema
    ↓
Validate output → Return structured data
```

## Schema Conversion

JSON Schema → Zod schema conversion in `extract.service.ts`:

| JSON Schema Type     | Zod Type      |
| -------------------- | ------------- |
| `object`             | `z.object()`  |
| `array`              | `z.array()`   |
| `string`             | `z.string()`  |
| `number` / `integer` | `z.number()`  |
| `boolean`            | `z.boolean()` |
| `null`               | `z.null()`    |

## Common Modification Scenarios

| Scenario              | Files to Modify                            | Notes                           |
| --------------------- | ------------------------------------------ | ------------------------------- |
| Add LLM provider      | `llm.client.ts`                            | Extend client                   |
| Change default prompt | `extract.service.ts`                       | Update `getDefaultSystemPrompt` |
| Add extraction option | `dto/extract.dto.ts`, `extract.service.ts` |                                 |
| Adjust concurrency    | `extract.service.ts`                       | `EXTRACT_CONCURRENCY` env       |

## Dependencies

```
extract/
├── scraper/ - Page content fetching
├── common/validators/ - SSRF protection
└── api-key/ - Authentication
```

## Environment Variables

| Variable              | Default | Description                |
| --------------------- | ------- | -------------------------- |
| `LLM_API_URL`         | -       | OpenAI-compatible API URL  |
| `LLM_API_KEY`         | -       | API key for LLM            |
| `EXTRACT_CONCURRENCY` | 5       | Max concurrent extractions |

## Key Exports

```typescript
export { ExtractModule } from './extract.module';
export { ExtractService } from './extract.service';
```
