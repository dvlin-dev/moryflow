# API Conventions

> Backend API design standards and conventions.

---

## API Versioning

All business APIs use `/api/v1` prefix.

```typescript
// Correct: version: '1' in controller decorator
@Controller({ path: 'scrape', version: '1' })
// Results in: /api/v1/scrape

// Excluded from versioning:
// - /health/* (infrastructure)
// - /webhooks/* (external callbacks)
// - /api/auth/* (Better Auth routes)
```

---

## Response Format

All business APIs use unified response format via `ResponseWrapInterceptor`.

### Success Response

```typescript
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```typescript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }  // Optional
  }
}
```

### Skipping Auto-Wrap

Use `@SkipResponseWrap()` for:
- `health.controller.ts` - Health checks
- `auth.controller.ts` - Better Auth
- `storage.controller.ts` - Binary data
- `payment-webhook.controller.ts` - External webhooks

---

## DTO Pattern (Zod-First)

All request validation uses Zod schemas with `createZodDto`.

```typescript
// dto/scrape.schema.ts
import { z } from 'zod';
import { createZodDto } from '@wahyubucil/nestjs-zod-openapi';

export const ScrapeSchema = z.object({
  url: z.string().url(),
  formats: z.array(z.enum(['markdown', 'html', 'screenshot'])),
}).openapi('ScrapeRequest');

export type ScrapeOptions = z.infer<typeof ScrapeSchema>;
export class ScrapeDto extends createZodDto(ScrapeSchema) {}
```

```typescript
// controller
@Post()
async scrape(@Body() dto: ScrapeDto) {
  // dto is already validated
  return this.service.scrape(dto);
}
```

---

## Error Handling

Use custom `HttpException` subclasses:

```typescript
// module.errors.ts
export class QuotaExceededError extends HttpException {
  constructor(available: number, required: number) {
    super(
      {
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: 'Insufficient quota',
          details: { available, required }
        }
      },
      HttpStatus.PAYMENT_REQUIRED
    );
  }
}
```

---

## Authentication

| Guard | Usage | Header |
|-------|-------|--------|
| `ApiKeyGuard` | Public API endpoints | `Authorization: Bearer lk_xxx` |
| `SessionGuard` | Console endpoints | Cookie session |
| `AdminGuard` | Admin endpoints | Admin session |

---

## File Locations

| Component | Path |
|-----------|------|
| Response Interceptor | `apps/server/src/common/interceptors/response.interceptor.ts` |
| Http Exception Filter | `apps/server/src/common/filters/http-exception.filter.ts` |
| Zod Validation Pipe | `apps/server/src/common/pipes/zod-validation.pipe.ts` |
| API Key Guard | `apps/server/src/api-key/api-key.guard.ts` |

---

*Version: 1.0 | Updated: 2026-01*
