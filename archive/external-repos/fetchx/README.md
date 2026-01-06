# aiget

**Web Data API for LLMs & AI Applications**

Turn any URL into clean, LLM-ready data. Extract content, scrape web pages, crawl entire sites, and more — all through a simple API.

---

## Product Vision

Provide developers with a powerful yet affordable web data extraction platform. Built for AI applications, indie developers, and small teams.

- **50% cheaper** than alternatives
- **Generous free tier** for getting started
- **Pay-as-you-go** flexibility

---

## Core Features

### Scrape API

Extract content from any URL with multiple output formats.

| Feature | Description |
|---------|-------------|
| Markdown | Clean, LLM-ready markdown output |
| HTML / Raw HTML | Structured or raw HTML content |
| Screenshot | Full page or viewport screenshots |
| Links | Extract all links from the page |
| Metadata | Title, description, OG image, favicon |
| Main Content Only | Remove navigation, ads, footers |

### Map API

Discover all URLs on a website without scraping content.

| Feature | Description |
|---------|-------------|
| Sitemap Parsing | Automatically parse sitemap.xml |
| Link Discovery | Crawl and extract all internal links |
| Subdomain Support | Include subdomains optionally |
| Fast Discovery | Get URL list without content extraction |

### Crawl API

Deep crawl websites and extract content from multiple pages.

| Feature | Description |
|---------|-------------|
| Multi-page Crawl | Crawl multiple pages from a starting URL |
| Depth Control | Set maximum crawl depth |
| Limit Control | Set maximum pages to crawl |
| Concurrent Processing | Parallel page processing |

### Extract API

Use AI to extract structured data from web pages.

| Feature | Description |
|---------|-------------|
| Natural Language | Describe what you want in plain English |
| JSON Schema | Define structured output format |
| LLM-powered | Intelligent data extraction |

### Search API

Search the web and get structured results.

| Feature | Description |
|---------|-------------|
| Web Search | Search across the internet |
| Result Scraping | Optionally scrape search results |
| Limit Control | Control number of results |

### Screenshot Engine

High-quality screenshots with advanced options.

| Feature | Description |
|---------|-------------|
| Custom Size | Any width and height |
| Multiple Formats | PNG, JPEG, WebP |
| Device Emulation | Desktop, tablet, mobile |
| Dark Mode | Force dark/light theme |
| Full Page | Capture entire page |
| CDN Delivery | Global CDN acceleration |

---

## Use Cases

**AI & LLM Applications**
Feed clean, structured web data to your AI models.

**Content Aggregation**
Build news readers, research tools, or content curators.

**Competitive Intelligence**
Monitor competitor websites and track changes.

**SEO & Site Audits**
Crawl sites to analyze structure and content.

**Link Preview Cards**
Generate rich previews for any URL.

**Web Archiving**
Capture and store web pages for future reference.

---

## API Examples

### Scrape a URL

```bash
curl -X POST https://api.aiget.dev/v1/scrape \
  -H "X-API-Key: lk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "formats": ["markdown", "screenshot"],
    "onlyMainContent": true
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "markdown": "# Example Domain\n\nThis domain is for...",
    "screenshot": {
      "url": "https://cdn.aiget.dev/screenshots/abc123.png",
      "width": 1280,
      "height": 800
    },
    "metadata": {
      "title": "Example Domain",
      "description": "..."
    },
    "processingMs": 1250
  }
}
```

### Map a Website

```bash
curl -X POST https://api.aiget.dev/v1/map \
  -H "X-API-Key: lk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "includeSubdomains": false
  }'
```

### Extract Structured Data

```bash
curl -X POST https://api.aiget.dev/v1/extract \
  -H "X-API-Key: lk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/product",
    "prompt": "Extract the product name, price, and description",
    "schema": {
      "name": "string",
      "price": "number",
      "description": "string"
    }
  }'
```

---

## Pricing

| Plan | Monthly | Credits | Per Credit |
|------|---------|---------|------------|
| Free | $0 | 100 | - |
| Basic | $9 | 5,000 | $0.0018 |
| Pro | $29 | 20,000 | $0.00145 |
| Team | $79 | 60,000 | $0.00132 |

### Pay As You Go

| Volume | Per Credit |
|--------|------------|
| 1 - 1,000 | $0.004 |
| 1,001 - 10,000 | $0.003 |
| 10,001 - 50,000 | $0.0025 |
| 50,000+ | $0.002 |

---

## Plan Comparison

| Feature | Free | Basic | Pro | Team |
|---------|------|-------|-----|------|
| Monthly Credits | 100 | 5,000 | 20,000 | 60,000 |
| Max Resolution | 1280x800 | 2560x1440 | 4K | 4K |
| Concurrency | 2 | 5 | 10 | 20 |
| File Retention | 7 days | 30 days | 90 days | 365 days |
| AI Extraction | - | - | Yes | Yes |
| Webhooks | - | - | Yes | Yes |

---

## Roadmap

### Phase 1: Core APIs - Done

- [x] Scrape API (markdown, HTML, links, screenshot)
- [x] Map API (URL discovery)
- [x] Crawl API (multi-page crawling)
- [x] Extract API (AI-powered extraction)
- [x] Search API (web search)
- [x] User Console & API Key Management

### Phase 2: Advanced Features - Done

- [x] oEmbed API Support
- [x] Demo Playground on Landing Page
- [x] Batch Scrape API
- [x] Webhook Notifications
- [ ] PDF Export

### Phase 3: Enterprise

- [ ] Private Deployment
- [ ] SLA Guarantee
- [ ] Dedicated Clusters

---

## Documentation

- [Technical Architecture](./docs/TECH_SPEC.md)
- [Development Guide](./agents.md)
- [Test Specification](./docs/TEST_SPEC.md)
- [Deployment Guide](./docs/deploy/DEPLOYMENT.md)
- [oEmbed API Design](./docs/features/oembed-api-design.md)

---

## Contact

- Website: [aiget.dev](https://aiget.dev)
- Email: support@aiget.dev

---

*aiget - Web Data API for the AI Era*
