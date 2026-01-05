# Map

> This folder structure changes require updating this document.

## Overview

URL discovery API for mapping website structure. Combines sitemap parsing with browser-based link crawling to discover all URLs on a site.

## Responsibilities

- Parse and extract URLs from sitemaps
- Crawl pages to discover linked URLs
- Filter by domain, subdomain, and search pattern
- Deduplicate and limit results

## Constraints

- Public API uses ApiKeyGuard
- SSRF protection via UrlValidator
- Excludes resource files (images, CSS, JS, etc.)
- Limits crawl depth to prevent infinite loops

## File Structure

| File | Type | Description |
|------|------|-------------|
| `map.service.ts` | Service | URL discovery orchestration |
| `map.controller.ts` | Controller | Public API `/v1/map` |
| `map.module.ts` | Module | NestJS module definition |
| `sitemap-parser.ts` | Parser | Sitemap.xml/robots.txt parsing |
| `dto/map.dto.ts` | DTO | Request/response schemas |

## Map Flow

```
POST /v1/map { url, search, limit }
    ↓
Validate URL (SSRF protection)
    ↓
1. Parse sitemap.xml
   └─ Filter by domain + search pattern
    ↓
2. If limit not reached:
   └─ Crawl pages for additional links
    ↓
Deduplicate → Return URL list
```

## URL Discovery Sources

| Source | Priority | Description |
|--------|----------|-------------|
| sitemap.xml | 1 | Primary source, most reliable |
| robots.txt sitemap refs | 2 | May reference multiple sitemaps |
| Page link crawling | 3 | Fallback for missing sitemap |

## Map Options

| Option | Default | Description |
|--------|---------|-------------|
| `url` | - | Starting URL |
| `search` | - | Filter URLs containing this string |
| `limit` | 5000 | Max URLs to return |
| `ignoreSitemap` | false | Skip sitemap, crawl only |
| `includeSubdomains` | false | Include subdomain URLs |

## Common Modification Scenarios

| Scenario | Files to Modify | Notes |
|----------|-----------------|-------|
| Add filter option | `dto/map.dto.ts`, `map.service.ts` | |
| Support new sitemap format | `sitemap-parser.ts` | |
| Change crawl depth | `map.service.ts` | `MAP_MAX_CRAWL_PAGES` env |
| Add URL metadata | `dto/map.dto.ts`, `sitemap-parser.ts` | lastmod, priority, etc. |

## Dependencies

```
map/
├── browser/ - Page crawling (BrowserPool)
├── common/validators/ - SSRF protection
└── api-key/ - Authentication
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAP_MAX_CRAWL_PAGES` | 100 | Max pages to visit during crawl |

## Key Exports

```typescript
export { MapModule } from './map.module'
export { MapService } from './map.service'
```
