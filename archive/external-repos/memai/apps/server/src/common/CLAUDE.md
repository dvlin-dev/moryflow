# Common Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Shared utilities for the server application. Provides guards, decorators, interceptors, filters, and utility functions used across all modules.

## Responsibilities

**Does:**
- Global guards (rate limiting, throttling)
- Response interceptors (unified format)
- Exception filters (error handling)
- Shared decorators
- Utility functions (pagination, HTTP helpers)
- Base repository class

**Does NOT:**
- Module-specific logic (each module handles its own)
- Authentication (handled by auth/, api-key/)
- Business logic (handled by feature modules)

## Member List

| File/Dir | Type | Description |
|----------|------|-------------|
| `guards/user-throttler.guard.ts` | Guard | Rate limiting per user/key |
| `guards/index.ts` | Export | Guards exports |
| `interceptors/response.interceptor.ts` | Interceptor | Unified response wrapper |
| `interceptors/api-key-isolation.interceptor.ts` | Interceptor | API key context isolation |
| `interceptors/index.ts` | Export | Interceptors exports |
| `decorators/api-key.decorator.ts` | Decorator | @ApiKeyContext |
| `decorators/response.decorator.ts` | Decorator | @Response metadata |
| `decorators/index.ts` | Export | Decorators exports |
| `filters/http-exception.filter.ts` | Filter | Global error handler |
| `filters/index.ts` | Export | Filters exports |
| `utils/pagination.utils.ts` | Utility | Pagination helpers |
| `utils/http.utils.ts` | Utility | HTTP utility functions |
| `utils/index.ts` | Export | Utils exports |
| `base.repository.ts` | Class | Base repository with common methods |
| `index.ts` | Export | Public module exports |

## Response Format

All API responses follow unified format:

```typescript
// Success response
{
  success: true,
  data: T,
  meta?: { pagination, ... }
}

// Error response
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: Record<string, unknown>
  }
}
```

## Exception Handling

```typescript
// Caught by HttpExceptionFilter
throw new NotFoundException('Memory not found');

// Custom module errors
throw new MemoryNotFoundError(id);
```

## Pagination Utility

```typescript
import { paginate, PaginationMeta } from '@/common';

const result = paginate(items, { page: 1, limit: 20 });
// Returns: { items, meta: { total, page, limit, totalPages } }
```

## Common Modification Scenarios

| Scenario | Files | Notes |
|----------|-------|-------|
| Add global guard | `guards/`, register in `app.module.ts` | Apply globally |
| Modify response format | `interceptors/response.interceptor.ts` | Update wrapper |
| Add utility function | `utils/` | Export via index.ts |
| Add decorator | `decorators/` | Export via index.ts |

## Dependencies

```
common/
├── depended by ← ALL server modules
└── no external module dependencies
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
