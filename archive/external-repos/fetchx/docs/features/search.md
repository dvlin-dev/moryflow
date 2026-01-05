# Search API

> Web search with optional result scraping.

---

## Requirement

Search the web and optionally scrape the search result pages.

---

## Technical Design

```
POST /api/v1/search
  ↓
SearchController.search()
  ↓
SearchService.search()
  ├── Call search provider (Serper API)
  └── [Optional] Scrape result URLs
```

---

## Core Logic

```typescript
// SearchService.search() - apps/server/src/search/search.service.ts
async search(userId: string, options: SearchOptions) {
  // 1. Call search API
  const searchResults = await this.serperClient.search({
    query: options.query,
    num: options.limit,
  });

  // 2. Optionally scrape results
  if (options.scrapeResults) {
    const scraped = await Promise.all(
      searchResults.map(result =>
        this.scraperService.scrapeSync(userId, {
          url: result.url,
          formats: ['markdown'],
          onlyMainContent: true,
        })
      )
    );

    return searchResults.map((result, i) => ({
      ...result,
      content: scraped[i]?.markdown,
    }));
  }

  return searchResults;
}
```

---

## Request/Response

```typescript
// Request
interface SearchOptions {
  query: string;           // Search query
  limit?: number;          // Max results (default: 10)
  scrapeResults?: boolean; // Scrape result pages (default: false)
}

// Response
interface SearchResult {
  title: string;
  url: string;
  description: string;
  content?: string;        // Only if scrapeResults=true
}
```

---

## File Locations

| Component | Path |
|-----------|------|
| Controller | `apps/server/src/search/search.controller.ts` |
| Service | `apps/server/src/search/search.service.ts` |
| DTO | `apps/server/src/search/dto/search.dto.ts` |

---

*Version: 1.0 | Updated: 2026-01*
