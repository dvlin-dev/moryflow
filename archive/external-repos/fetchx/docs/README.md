# AIGet Documentation

> Web Data API for LLMs & AI

---

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture Overview](./architecture/overview.md) | System architecture and tech stack |
| [Testing](./architecture/testing.md) | Test strategy and conventions |
| [Unified Identity Platform](./architecture/unified-identity-platform.md) | 跨产品统一身份与资源共享平台设计 |

---

## Feature Documentation

| Feature | Description | Status |
|---------|-------------|--------|
| [Scraper APIs](./features/scraper.md) | Scrape, Crawl, Map, Batch Scrape | Implemented |
| [Extract API](./features/extract.md) | AI-powered data extraction | Implemented |
| [Search API](./features/search.md) | Web search with scraping | Implemented |
| [oEmbed API](./features/oembed.md) | Third-party content embedding | Implemented |
| [Agent Sandbox](./features/agent-sandbox.md) | AI Agent execution environment | Planned |

---

## Development Guides

| Guide | Description |
|-------|-------------|
| [API Conventions](./guides/api-conventions.md) | API design standards |
| [Deployment](./deploy/deployment.md) | Production deployment |

---

## Project Structure

```
docs/
├── README.md                 # This file
├── architecture/             # System architecture
│   ├── overview.md
│   ├── testing.md
│   └── unified-identity-platform.md
├── features/                 # Feature documentation
│   ├── scraper.md
│   ├── extract.md
│   ├── search.md
│   ├── oembed.md
│   └── agent-sandbox.md
├── guides/                   # Development guides
│   └── api-conventions.md
└── deploy/                   # Deployment docs
    └── deployment.md
```

---

## Documentation Standards

Each feature document follows this structure:

1. **Requirement** - What the feature does
2. **Technical Design** - Request flow diagram
3. **Core Logic** - Pseudocode with key algorithms
4. **File Locations** - Index to source files

---

*Updated: 2026-01*
