# Search

> This folder structure changes require updating this document.

## Overview

Web search API powered by SearXNG. Returns search results with optional content scraping for each result URL.

## Responsibilities

- Execute web searches via SearXNG
- Filter and transform search results
- Optionally scrape result pages for content
- Provide autocomplete suggestions

## Constraints

- Public API uses ApiKeyGuard
- Requires SearXNG instance
- Retry with exponential backoff on failure
- Quota deducted per search (+ per scrape if enabled)

## File Structure

| File                   | Type       | Description                            |
| ---------------------- | ---------- | -------------------------------------- |
| `search.service.ts`    | Service    | Search execution and result enrichment |
| `search.controller.ts` | Controller | Public API `/v1/search`                |
| `search.module.ts`     | Module     | NestJS module definition               |
| `search.types.ts`      | Types      | SearXNG response types                 |
| `dto/search.dto.ts`    | DTO        | Request/response schemas               |

## Search Flow

```
POST /v1/search { query, limit, scrapeResults }
    ↓
Build SearXNG query params
    ↓
Call SearXNG API (with retry)
    ↓
Transform results → Limit count
    ↓
If scrapeResults:
    └─ Scrape each URL (concurrent)
    ↓
Return enriched results
```

## Search Options

| Option          | Description                                     |
| --------------- | ----------------------------------------------- |
| `query`         | Search query string                             |
| `limit`         | Max results (default: 10)                       |
| `categories`    | Search categories (general, images, news, etc.) |
| `engines`       | Specific search engines                         |
| `language`      | Language code                                   |
| `timeRange`     | Time filter (day, week, month, year)            |
| `safeSearch`    | Safe search level (0, 1, 2)                     |
| `scrapeResults` | Whether to scrape result pages                  |
| `scrapeOptions` | Options passed to ScraperService                |

## Common Modification Scenarios

| Scenario            | Files to Modify                          | Notes                       |
| ------------------- | ---------------------------------------- | --------------------------- |
| Add search option   | `dto/search.dto.ts`, `search.service.ts` |                             |
| Change retry config | `search.service.ts`                      | Update constants            |
| Add result field    | `search.types.ts`, `search.service.ts`   | Map from SearXNG            |
| Add search provider | `search.service.ts`                      | Abstract provider interface |

## Dependencies

```
search/
├── scraper/ - Result page content fetching
├── api-key/ - Authentication
└── SearXNG - External search service
```

## Environment Variables

| Variable             | Default                 | Description            |
| -------------------- | ----------------------- | ---------------------- |
| `SEARXNG_URL`        | `http://localhost:8080` | SearXNG instance URL   |
| `SEARCH_RETRY_COUNT` | 3                       | Max retry attempts     |
| `SEARCH_RETRY_DELAY` | 1000                    | Base retry delay (ms)  |
| `SEARCH_CONCURRENCY` | 5                       | Max concurrent scrapes |

## Key Exports

```typescript
export { SearchModule } from './search.module';
export { SearchService } from './search.service';
```
