# Web Scraping APIs

> Core APIs for web data extraction: Scrape, Crawl, Map, Batch Scrape.

---

## Overview

| API | Purpose | Sync/Async |
|-----|---------|------------|
| **Scrape** | Single URL extraction | Async (job-based) |
| **Crawl** | Multi-page site crawling | Async (job-based) |
| **Map** | URL discovery (sitemap + crawl) | Sync |
| **Batch Scrape** | Bulk URL processing (1-100) | Async (job-based) |

---

## Scrape API

### Requirement

Extract content from a single URL in multiple formats: markdown, HTML, screenshot, links.

### Technical Design

```
POST /api/v1/scrape
  ↓
ScraperController.scrape()
  ↓
ScraperService.scrape()
  ├── SSRF Check (UrlValidator)
  ├── Cache Lookup (requestHash)
  ├── Quota Deduction
  └── Queue Job → ScraperProcessor
```

### Core Logic

```typescript
// ScraperService.scrape() - apps/server/src/scraper/scraper.service.ts
async scrape(userId: string, options: ScrapeOptions) {
  // 1. Validate URL (SSRF protection)
  if (!this.urlValidator.isAllowed(options.url)) {
    throw new SSRFError(options.url);
  }

  // 2. Check cache by request hash
  const hash = computeRequestHash(options);
  const cached = await this.findCachedResult(hash);
  if (cached) return { ...cached, fromCache: true };

  // 3. Create job and queue for processing
  const job = await this.prisma.scrapeJob.create({ ... });
  await this.queue.add('scrape', { jobId: job.id, ... });
  return job;
}
```

```typescript
// ScraperProcessor.process() - apps/server/src/scraper/scraper.processor.ts
async process(job: Job) {
  const context = await this.browserPool.acquireContext();
  const page = await context.newPage();

  try {
    // 1. Configure page (viewport, UA, dark mode)
    await this.pageConfigHandler.configure(page, options);

    // 2. Navigate and wait
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.waitStrategyHandler.waitForPageReady(page, options);

    // 3. Execute actions if any
    if (options.actions) {
      await this.actionExecutor.execute(page, options.actions);
    }

    // 4. Extract content based on formats
    const result = {};
    if (formats.includes('markdown')) {
      result.markdown = await this.markdownTransformer.convert(html);
    }
    if (formats.includes('screenshot')) {
      result.screenshot = await this.screenshotHandler.process(page);
    }
    // ...

    return result;
  } finally {
    await page.close();
    await this.browserPool.releaseContext(context);
  }
}
```

### File Locations

| Component | Path |
|-----------|------|
| Controller | `apps/server/src/scraper/scraper.controller.ts` |
| Service | `apps/server/src/scraper/scraper.service.ts` |
| Processor | `apps/server/src/scraper/scraper.processor.ts` |
| Page Config | `apps/server/src/scraper/handlers/page-config.handler.ts` |
| Wait Strategy | `apps/server/src/scraper/handlers/wait-strategy.handler.ts` |
| Screenshot | `apps/server/src/scraper/handlers/screenshot.handler.ts` |
| Markdown | `apps/server/src/scraper/transformers/markdown.transformer.ts` |

---

## Crawl API

### Requirement

Crawl entire website starting from a URL, respecting depth limits and URL patterns.

### Technical Design

```
POST /api/v1/crawl
  ↓
CrawlerController.create()
  ↓
CrawlerService.create()
  └── Queue CrawlerProcessor
        ├── MapService.map() → Discover URLs
        └── For each URL → Queue ScrapeJob
```

### Core Logic

```typescript
// CrawlerService.create() - apps/server/src/crawler/crawler.service.ts
async create(userId: string, options: CrawlOptions) {
  // 1. Create crawl job
  const crawlJob = await this.prisma.crawlJob.create({
    data: { userId, startUrl: options.url, status: 'PENDING' }
  });

  // 2. Queue for processing
  await this.queue.add('crawl', { crawlJobId: crawlJob.id, options });
  return crawlJob;
}
```

```typescript
// CrawlerProcessor.process()
async process(job: Job) {
  // 1. Discover URLs using Map
  const urls = await this.mapService.map({
    url: options.url,
    limit: options.limit,
    maxDiscoveryDepth: options.maxDiscoveryDepth,
  });

  // 2. Queue scrape jobs for each URL
  for (const url of urls.links) {
    await this.scraperQueue.add('scrape', {
      crawlJobId,
      url,
      options: options.scrapeOptions
    });
  }
}
```

### File Locations

| Component | Path |
|-----------|------|
| Controller | `apps/server/src/crawler/crawler.controller.ts` |
| Service | `apps/server/src/crawler/crawler.service.ts` |
| Processor | `apps/server/src/crawler/crawler.processor.ts` |

---

## Map API

### Requirement

Discover all URLs on a website via sitemap parsing and optional crawling.

### Technical Design

```
POST /api/v1/map
  ↓
MapController.map()
  ↓
MapService.map()
  ├── SitemapParser.fetchAndParse()
  └── Browser crawl (if sitemap insufficient)
```

### Core Logic

```typescript
// MapService.map() - apps/server/src/map/map.service.ts
async map(options: MapOptions) {
  const urls = new Set<string>();

  // 1. Parse sitemap (unless ignored)
  if (!options.ignoreSitemap) {
    const sitemapUrls = await this.sitemapParser.fetchAndParse(options.url);
    sitemapUrls.forEach(u => urls.add(u.url));
  }

  // 2. Crawl for additional URLs if needed
  if (urls.size < options.limit) {
    const crawledUrls = await this.crawlForUrls(options.url, options.limit);
    crawledUrls.forEach(u => urls.add(u));
  }

  // 3. Filter by search term, domain, etc.
  let result = [...urls];
  if (options.search) {
    result = result.filter(u => u.includes(options.search));
  }

  return { links: result.slice(0, options.limit), count: result.length };
}
```

### File Locations

| Component | Path |
|-----------|------|
| Controller | `apps/server/src/map/map.controller.ts` |
| Service | `apps/server/src/map/map.service.ts` |
| Sitemap Parser | `apps/server/src/map/sitemap-parser.ts` |

---

## Batch Scrape API

### Requirement

Process multiple URLs (1-100) in a single request with shared options.

### Technical Design

```
POST /api/v1/batch/scrape
  ↓
BatchScrapeController.create()
  ↓
BatchScrapeService.create()
  └── For each URL → Queue ScrapeJob
```

### Core Logic

```typescript
// BatchScrapeService.create() - apps/server/src/batch-scrape/batch-scrape.service.ts
async create(userId: string, options: BatchScrapeOptions) {
  // 1. Create batch job
  const batchJob = await this.prisma.batchJob.create({
    data: { userId, status: 'PENDING', totalUrls: options.urls.length }
  });

  // 2. Queue individual scrape jobs
  for (const url of options.urls) {
    await this.scraperQueue.add('scrape', {
      batchJobId: batchJob.id,
      url,
      options: options.scrapeOptions,
    });
  }

  return batchJob;
}
```

### File Locations

| Component | Path |
|-----------|------|
| Controller | `apps/server/src/batch-scrape/batch-scrape.controller.ts` |
| Service | `apps/server/src/batch-scrape/batch-scrape.service.ts` |
| Processor | `apps/server/src/batch-scrape/batch-scrape.processor.ts` |

---

## Common Components

### Actions (Page Interactions)

```typescript
// Supported action types
type Action =
  | { type: 'click'; selector: string }
  | { type: 'wait'; milliseconds: number }
  | { type: 'scroll'; direction: 'up' | 'down' }
  | { type: 'write'; selector: string; text: string }
  | { type: 'screenshot' }
  | { type: 'scrape' };
```

Location: `apps/server/src/scraper/handlers/action-executor.handler.ts`

### SSRF Protection

```typescript
// UrlValidator blocks:
// - Private IPs (10.x, 192.168.x, 172.16-31.x)
// - Localhost (127.0.0.1, ::1)
// - Cloud metadata (169.254.169.254)
// - Internal hostnames
```

Location: `apps/server/src/common/validators/url.validator.ts`

---

*Version: 2.0 | Updated: 2026-01*
