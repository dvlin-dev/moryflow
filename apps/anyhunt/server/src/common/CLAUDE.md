# Common

> This folder structure changes require updating this document.

## Overview

Shared infrastructure components used across all modules. Contains guards, decorators, pipes, filters, validators, and utilities.

## 最近更新

- UrlValidator 单测使用 `vi.resetModules()` + 动态导入，确保 DNS mock 对每次测试生效
- BaseRepository 注释同步为 MemoxEntity/Memory
- HttpExceptionFilter 切换 RFC7807 错误体，移除 response 包装逻辑
- 新增 ProblemDetails 工具函数并用于统一构建错误体与请求 ID

## Responsibilities

- Request validation (ZodValidationPipe)
- Exception handling (HttpExceptionFilter)
- URL security validation (SSRF protection)
- Rate limiting
- Shared utilities (crypto, HTTP, JSON, pagination, origin match)
- BaseRepository for apiKey-isolated tables

## Constraints

- No business logic in this module
- Pure infrastructure/utility functions only
- Must be stateless and reusable
- Don't depend on business modules

## File Structure

| Directory      | Description                             |
| -------------- | --------------------------------------- |
| `guards/`      | Authentication and rate limiting guards |
| `pipes/`       | Request validation pipes                |
| `filters/`     | Exception filters                       |
| `validators/`  | URL and input validators                |
| `schemas/`     | Shared Zod schemas                      |
| `services/`    | Shared services (webhook)               |
| `utils/`       | Pure utility functions                  |
| `constants/`   | Error codes and constants               |
| `controllers/` | Not-found controller                    |

## Key Files

| File                               | Type      | Description                             |
| ---------------------------------- | --------- | --------------------------------------- |
| `base.repository.ts`               | Utility   | Base repository with apiKeyId isolation |
| `pipes/zod-validation.pipe.ts`     | Pipe      | Global Zod schema validation            |
| `filters/http-exception.filter.ts` | Filter    | RFC7807 error response format           |
| `validators/url.validator.ts`      | Validator | SSRF protection, URL validation         |
| `guards/user-throttler.guard.ts`   | Guard     | User-based rate limiting                |
| `utils/crypto.utils.ts`            | Utility   | Hash, encryption functions              |
| `utils/http.utils.ts`              | Utility   | HTTP client helpers                     |
| `utils/json.utils.ts`              | Utility   | Prisma JSON → Record conversion         |
| `utils/json.zod.ts`                | Schema    | JsonValueSchema                         |
| `utils/pagination.utils.ts`        | Utility   | Pagination helpers                      |
| `utils/origin.utils.ts`            | Utility   | Origin 匹配（支持通配符）               |
| `utils/subscription-tier.ts`       | Utility   | 订阅状态 → 有效 tier 计算               |
| `utils/ssrf-fetch.ts`              | Utility   | SSRF-safe fetch + redirect validation   |
| `schemas/pagination.schema.ts`     | Schema    | Shared pagination schema                |
| `constants/error-codes.ts`         | Constants | Unified error code definitions          |
| `services/webhook.service.ts`      | Service   | Webhook dispatch utility                |

## URL Validator (Critical)

The `url.validator.ts` provides SSRF protection with DNS resolution and IPv6 normalization:

```typescript
import { UrlValidator } from '@/common/validators/url.validator';

const allowed = await urlValidator.isAllowed(url);
if (!allowed) throw new UrlNotAllowedError(url);

// Blocks:
// - Private/reserved IP ranges (IPv4/IPv6, incl. metadata endpoints)
// - localhost and local domains (.local/.internal/.localhost)
// - URLs with credentials
// - Non-HTTP(S) protocols
```

## Common Modification Scenarios

| Scenario              | Files to Modify                  | Notes                  |
| --------------------- | -------------------------------- | ---------------------- |
| Add global validation | `pipes/`                         | Register in app.module |
| Add new error code    | `constants/error-codes.ts`       | Use in error classes   |
| Add security check    | `validators/`                    | Apply in controllers   |
| Add rate limit rule   | `guards/user-throttler.guard.ts` |                        |

## Usage Examples

### ZodValidationPipe

```typescript
// Automatically applied globally
@Body() dto: ScrapeRequestDto  // Validated via Zod
```

### URL Validation

```typescript
const allowed = await urlValidator.isAllowed(url);
if (!allowed) {
  throw new UrlNotAllowedError(url);
}
```

## Dependencies

```
common/
├── zod - Schema validation
├── ioredis - Rate limiting storage
└── @nestjs/throttler - Rate limiting
```

## Key Exports

```typescript
export { ZodValidationPipe } from './pipes';
export { HttpExceptionFilter } from './filters';
export { UrlValidator } from './validators';
export { WebhookService } from './services';
export { hashApiKey, generateApiKey } from './utils';
export { ERROR_CODES } from './constants';
```
