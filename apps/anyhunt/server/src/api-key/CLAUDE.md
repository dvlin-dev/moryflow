# API Key

> This folder structure changes require updating this document.

## Overview

API key management for authenticating public API requests. Handles creation, validation, rotation, and revocation of API keys.

## Responsibilities

- Generate secure API keys with `ah_` prefix
- Store plaintext `keyValue` (for list/copy in Console)
- Use SHA256 hash only for Redis cache key
- Validate API keys on requests
- Track key usage and last used timestamp
- Support key revocation and rotation
- 删除 ApiKey 时异步清理向量库关联数据（Memory、MemoxEntity、History/Feedback/Export）

## Constraints

- Keys must have `ah_` prefix
- 明文 Key 存储在 `keyValue`，列表接口返回 `key`（前端脱敏展示）
- 响应 `Cache-Control: no-store`，避免缓存明文 Key（create/list/update）
- Redis 缓存使用 `sha256(apiKey)` 作为 key，避免明文进入缓存
- subscriptionTier 仅在订阅 ACTIVE 时视为付费 tier

## File Structure

| File                        | Type       | Description                      |
| --------------------------- | ---------- | -------------------------------- |
| `api-key.service.ts`        | Service    | Key generation, validation, CRUD |
| `api-key.controller.ts`     | Controller | App API for key management       |
| `api-key.guard.ts`          | Guard      | Request authentication guard     |
| `api-key.module.ts`         | Module     | NestJS module definition         |
| `api-key.constants.ts`      | Constants  | Key prefix, hash algorithm       |
| `api-key.types.ts`          | Types      | ApiKey type definitions          |
| `api-key.decorators.ts`     | Decorators | @CurrentApiKey decorator         |
| `dto/create-api-key.dto.ts` | DTO        | Create key request schema        |
| `dto/update-api-key.dto.ts` | DTO        | Update key request schema        |

## Key Format

```
ah_[64 hex chars]
Example: ah_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

## Authentication Flow

```
Request with Authorization: Bearer <apiKey>
    ↓
ApiKeyGuard extracts key
    ↓
Hash key → Check cache → Query database by keyValue
    ↓
Found? → Attach to request context
    ↓
Not found? → 403 Forbidden
```

## Common Modification Scenarios

| Scenario               | Files to Modify                              | Notes                     |
| ---------------------- | -------------------------------------------- | ------------------------- |
| Add key permission     | `api-key.types.ts`, `api-key.guard.ts`       | Add permission check      |
| Add rate limit per key | `api-key.guard.ts`                           | Integrate with throttler  |
| Add key metadata       | `dto/`, `api-key.service.ts`                 | Update schema and service |
| Change key format      | `api-key.constants.ts`, `api-key.service.ts` | Update prefix/length      |

## Key Methods

```typescript
// Generate new key (returns plaintext once)
const { key } = await apiKeyService.create(userId, name);

// Validate key from request
const apiKey = await apiKeyService.validateKey(plaintextKey);

// List user's keys
const keys = await apiKeyService.findAllByUser(userId);

// Disable key
await apiKeyService.update(userId, keyId, { isActive: false });
```

## Usage in Controllers

```typescript
@Controller({ path: 'scrape', version: '1' })
@UseGuards(ApiKeyGuard)
export class ScrapeController {
  @Get()
  async scrape(@CurrentApiKey() apiKey: ApiKey) {
    // apiKey contains user info, permissions
  }
}
```

## Dependencies

```
api-key/
├── prisma/ - 主库存储（ApiKey 表）
├── vector-prisma/ - 向量库（删除时清理 Memory/MemoxEntity/History/Feedback/Export）
├── common/utils/crypto - Hashing
└── auth/ - User context
```

## Key Exports

```typescript
export { ApiKeyModule } from './api-key.module';
export { ApiKeyService } from './api-key.service';
export { ApiKeyGuard } from './api-key.guard';
export { CurrentApiKey } from './api-key.decorators';
```
