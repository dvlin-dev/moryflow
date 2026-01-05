# Server

> This folder structure changes require updating this document.

## Overview

Backend API + Web Data Engine built with NestJS. Core service for web scraping, crawling, and data extraction.

## Responsibilities

- Handle API requests for scraping, crawling, map, extract, search, batch-scrape
- Manage browser pool for rendering pages
- Process async jobs via BullMQ
- Quota and API key management
- User authentication and authorization

## Constraints

- All controllers must use `version: '1'` for API versioning
- Use `ApiKeyGuard` for public API endpoints
- Use `SessionGuard` for console endpoints
- URL validation required for SSRF protection
- Quota deduction before any scrape operation

## Module Structure

| Module | Files | Description | CLAUDE.md |
|--------|-------|-------------|-----------|
| `scraper/` | 24 | Core scraping engine | `src/scraper/CLAUDE.md` |
| `common/` | 22 | Shared guards, decorators, pipes, validators | `src/common/CLAUDE.md` |
| `admin/` | 16 | Admin dashboard APIs | - |
| `oembed/` | 18 | oEmbed provider support | - |
| `quota/` | 14 | Quota management | `src/quota/CLAUDE.md` |
| `api-key/` | 13 | API key management | `src/api-key/CLAUDE.md` |
| `crawler/` | 11 | Multi-page crawling | `src/crawler/CLAUDE.md` |
| `auth/` | 10 | Authentication (Better Auth) | `src/auth/CLAUDE.md` |
| `payment/` | 10 | Payment processing (Creem) | - |
| `webhook/` | 10 | Webhook notifications | - |
| `extract/` | 9 | AI-powered data extraction | - |
| `batch-scrape/` | 9 | Bulk URL processing | - |
| `user/` | 9 | User management | - |
| `map/` | 8 | URL discovery | - |
| `storage/` | 7 | Cloudflare R2 storage | - |
| `search/` | 6 | Web search API | - |
| `browser/` | 5 | Browser pool management | - |
| `demo/` | 5 | Playground demo API | - |
| `redis/` | 4 | Redis caching | - |
| `health/` | 3 | Health check endpoints | - |
| `email/` | 3 | Email service | - |
| `queue/` | 3 | BullMQ queue config | - |
| `prisma/` | 3 | Database access | - |
| `config/` | 2 | Pricing configuration | - |
| `types/` | 6 | Shared type definitions | - |

## Common Patterns

### Module File Structure

```
module-name/
├── dto/
│   ├── index.ts
│   └── module-name.dto.ts
├── __tests__/
│   └── module-name.service.spec.ts
├── module-name.module.ts
├── module-name.controller.ts
├── module-name.service.ts
├── module-name.constants.ts
├── module-name.errors.ts
├── module-name.types.ts
└── index.ts
```

### Controller Pattern

```typescript
@Controller({ path: 'endpoint', version: '1' })
@UseGuards(ApiKeyGuard)  // For public API
export class ModuleController {
  @Get()
  @ApiOperation({ summary: 'Description' })
  async method(@Body() dto: RequestDto): Promise<ResponseDto> {}
}
```

## Dependencies

```
apps/server
├── @nestjs/* - Framework
├── @prisma/client - Database ORM
├── bullmq - Job queue
├── ioredis - Redis client
├── playwright - Browser automation
├── sharp - Image processing
├── better-auth - Authentication
└── zod - Schema validation
```

## Test Commands

```bash
pnpm --filter server test        # All tests
pnpm --filter server test:unit   # Unit tests only
pnpm --filter server test:cov    # With coverage
pnpm --filter server test:ci     # CI full test
```

## Common Modification Scenarios

| Scenario | Files to Modify | Notes |
|----------|-----------------|-------|
| Add new API endpoint | `*.controller.ts`, `*.service.ts`, `dto/*.ts` | Add DTO with Zod schema |
| Add new scrape format | `scraper/transformers/` | Create new transformer |
| Add rate limiting | `common/guards/` | Extend throttler guard |
| Add new payment flow | `payment/` | Update webhook handler too |
