# Architecture Overview

> Web Data API for LLMs & AI - Turn any URL into clean, LLM-ready data.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite + TailwindCSS v4 + shadcn/ui |
| Backend | NestJS 11 + Prisma 7 + PostgreSQL |
| Queue | Redis + BullMQ |
| Browser | Playwright |
| Storage | Cloudflare R2 + CDN |
| Auth | Better Auth |
| Payment | Creem |

---

## Project Structure

```
apps/
├── server/          # Backend API (NestJS)
├── console/         # User Console (React)
├── admin/           # Admin Dashboard (React)
├── www/             # Landing Page (TanStack Start)
└── docs/            # Documentation (Fumadocs)

packages/
├── ui/              # Shared UI Components
└── shared-types/    # Shared Type Definitions
```

---

## Backend Module Architecture

```
apps/server/src/
├── scraper/         # Scrape API - single URL extraction
├── crawler/         # Crawl API - multi-page crawling
├── map/             # Map API - URL discovery
├── batch-scrape/    # Batch Scrape API - bulk processing
├── extract/         # Extract API - AI data extraction
├── search/          # Search API - web search
├── browser/         # Browser pool (Playwright)
├── quota/           # Quota management
├── api-key/         # API Key management
├── auth/            # Authentication (Better Auth)
├── payment/         # Payment (Creem)
├── webhook/         # Webhook notifications
└── common/          # Shared utilities
```

### Core Flow

```
Request → Auth Guard → Quota Check → Cache Lookup
                                         ↓
                            [Cache Hit] → Return cached result
                            [Cache Miss] → Queue Job → Browser Process → Store Result
```

### Key Patterns

| Pattern | Usage |
|---------|-------|
| Repository Pattern | `Service → Repository → Prisma` |
| Queue Processing | BullMQ for async jobs |
| SSRF Protection | URL validation via `UrlValidator` |
| Caching | Request hash → shared cache |

---

## Database Schema

Core entities:

```prisma
model User {
  id            String   @id
  apiKeys       ApiKey[]
  quota         Quota?
  subscription  Subscription?
}

model ScrapeJob {
  id          String       @id
  url         String
  status      ScrapeStatus
  result      Json?
  requestHash String       // For cache lookup
}

model CrawlJob {
  id          String      @id
  startUrl    String
  status      CrawlStatus
  scrapeJobs  ScrapeJob[]
}
```

---

## File Locations

| Component | Path |
|-----------|------|
| Scraper Service | `apps/server/src/scraper/scraper.service.ts` |
| Scraper Processor | `apps/server/src/scraper/scraper.processor.ts` |
| Browser Pool | `apps/server/src/browser/browser-pool.ts` |
| URL Validator | `apps/server/src/common/validators/url.validator.ts` |
| Quota Service | `apps/server/src/quota/quota.service.ts` |

---

*Version: 4.0 | Updated: 2026-01*
