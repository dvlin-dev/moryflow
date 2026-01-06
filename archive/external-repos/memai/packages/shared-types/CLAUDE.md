# Shared Types Package

> Warning: When this folder structure changes, you MUST update this document

## Position

Shared TypeScript type definitions for the Memai platform. Provides common types used across multiple packages and applications.

## Directory Structure

```
packages/shared-types/src/
├── index.ts              # Main exports
├── api.ts                # API response types
├── screenshot.ts         # Screenshot service types
└── tier.ts               # Subscription tier types
```

## Type Definitions

### api.ts - API Response Types

```typescript
// Pagination
PaginationMeta { total, limit, offset, hasMore }

// Response wrappers
ApiSuccessResponse<T> { success: true, data: T, meta? }
ApiPaginatedResponse<T> { success: true, data: T[], meta: { pagination } }
ApiErrorResponse { success: false, error: { code, message, details? } }
ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// API Key
QuotaStatus { used, limit, remaining }
ApiKeyInfo { id, name, prefix, ... }
CreateApiKeyResponse { key, apiKey }
```

### tier.ts - Subscription Types

```typescript
// Enums
SubscriptionTier = 'FREE' | 'BASIC' | 'PRO' | 'TEAM'
SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'EXPIRED'

// Configuration
TierConfig {
  name, price (monthly/yearly), quota,
  limits (rate, concurrent, storage),
  features (fullPage, clip, scripts, webhook)
}

// Constants
TIER_CONFIGS: Record<SubscriptionTier, TierConfig>
QUOTA_PRICING: StepPricing[]
```

### screenshot.ts - Screenshot Service Types

```typescript
// Request
ScreenshotRequest {
  url, viewport?, format?, quality?,
  delay?, waitFor?, clip?, hide?,
  darkMode?, userAgent?, timeout?
}

// Response
ScreenshotResponse { success, data?, error? }
DevicePreset = 'desktop' | 'tablet' | 'mobile'

// Error codes (14 defined)
INVALID_URL, UNAUTHORIZED, QUOTA_EXCEEDED, ...
```

## Usage

```typescript
import {
  ApiResponse,
  SubscriptionTier,
  TIER_CONFIGS,
  ScreenshotRequest
} from '@memai/shared-types'
```

## Constraints

- Types only, no runtime code
- Export all types via index.ts
- Use enums for fixed value sets
- Use const objects for configurations

## Dependencies

```
@memai/shared-types
├── depended by ← apps/server
├── depended by ← apps/console
├── depended by ← apps/admin
└── depended by ← packages/ui
```

---

*See root [CLAUDE.md](../../CLAUDE.md) for global conventions*
