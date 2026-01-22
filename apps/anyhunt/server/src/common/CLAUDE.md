# Common

> This folder structure changes require updating this document.

## Overview

Shared infrastructure components used across all modules. Contains guards, decorators, pipes, filters, validators, and utilities.

## Responsibilities

- Request validation (ZodValidationPipe)
- Exception handling (HttpExceptionFilter)
- URL security validation (SSRF protection)
- Response transformation
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
| `decorators/`  | Custom decorators for controllers       |
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
| `filters/http-exception.filter.ts` | Filter    | Unified error response format           |
| `validators/url.validator.ts`      | Validator | SSRF protection, URL validation         |
| `guards/user-throttler.guard.ts`   | Guard     | User-based rate limiting                |
| `decorators/response.decorator.ts` | Decorator | Response transformation                 |
| `utils/crypto.utils.ts`            | Utility   | Hash, encryption functions              |
| `utils/http.utils.ts`              | Utility   | HTTP client helpers                     |
| `utils/json.utils.ts`              | Utility   | Prisma JSON → Record conversion         |
| `utils/json.zod.ts`                | Schema    | JsonValueSchema                         |
| `utils/pagination.utils.ts`        | Utility   | Pagination helpers                      |
| `utils/origin.utils.ts`            | Utility   | Origin 匹配（支持通配符）               |
| `schemas/pagination.schema.ts`     | Schema    | Shared pagination schema                |
| `constants/error-codes.ts`         | Constants | Unified error code definitions          |
| `services/webhook.service.ts`      | Service   | Webhook dispatch utility                |

## URL Validator (Critical)

The `url.validator.ts` provides SSRF protection:

```typescript
import { isUrlAllowed } from '@/common/validators/url.validator';

// Blocks:
// - Private IPs (10.x, 192.168.x, 127.x, etc.)
// - Localhost
// - Cloud metadata endpoints (169.254.169.254)
// - Non-HTTP(S) protocols
```

## Common Modification Scenarios

| Scenario              | Files to Modify                    | Notes                  |
| --------------------- | ---------------------------------- | ---------------------- |
| Add global validation | `pipes/`                           | Register in app.module |
| Add new error code    | `constants/error-codes.ts`         | Use in error classes   |
| Add security check    | `validators/`                      | Apply in controllers   |
| Add response wrapper  | `decorators/response.decorator.ts` |                        |
| Add rate limit rule   | `guards/user-throttler.guard.ts`   |                        |

## Usage Examples

### ZodValidationPipe

```typescript
// Automatically applied globally
@Body() dto: ScrapeRequestDto  // Validated via Zod
```

### URL Validation

```typescript
import { isUrlAllowed } from '@/common/validators/url.validator';

if (!isUrlAllowed(url)) {
  throw new UrlNotAllowedError(url);
}
```

### Response Decorator

```typescript
@ApiSuccessResponse(ScrapeResponseDto)
async scrape() { ... }
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
export { isUrlAllowed, validateUrl } from './validators';
export { hashApiKey, generateApiKey } from './utils';
export { ERROR_CODES } from './constants';
```
