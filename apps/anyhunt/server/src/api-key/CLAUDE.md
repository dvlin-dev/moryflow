# API Key

> This folder structure changes require updating this document.

## Overview

API key management for authenticating public API requests.
当前实现为 **hash-only**：数据库不保存明文 key。
`Moryflow Server` 与未来第三方客户最终都必须消费这一套公开 API Key 契约。

## Responsibilities

- Generate secure API keys with `ah_` prefix
- Store `keyHash` + `keyPrefix` + `keyTail` only
- Create API returns plaintext key exactly once (`plainKey`)
- List/Update only return `keyPreview` (e.g. `ah_****abcd`)
- Validate API keys by `sha256(apiKey)`
- Track key usage and last used timestamp
- Support key revocation and rotation
- 删除 ApiKey 时在主库创建 `ApiKeyCleanupTask`，再投递 BullMQ durable cleanup job
- cleanup 范围必须覆盖 `MemoryFact* / KnowledgeSource* / SourceChunk / Graph* / R2 source blobs`

## Constraints

- Keys must have `ah_` prefix
- 数据库存储：`keyHash/keyPrefix/keyTail`，禁止明文
- 响应 `Cache-Control: no-store`（create/list/update）
- Redis 缓存 key 使用 `sha256(apiKey)`，避免明文进入缓存
- subscriptionTier 仅在订阅 ACTIVE 时视为付费 tier
- `ApiKeyModule` 必须显式注册 `ApiKeyCleanupService` + `ApiKeyCleanupProcessor`，并导入 `QueueModule` 与 `MemoxPlatformModule`；否则 cleanup job 只会入队，不会被 worker 消费

## File Structure

| File                           | Type       | Description                                   |
| ------------------------------ | ---------- | --------------------------------------------- |
| `api-key.service.ts`           | Service    | Key generation, hash validation, CRUD         |
| `api-key-cleanup.service.ts`   | Service    | Durable cleanup task enqueue/recovery/process |
| `api-key-cleanup.processor.ts` | Processor  | ApiKey cleanup queue worker                   |
| `api-key.controller.ts`        | Controller | App API for key management                    |
| `api-key.guard.ts`             | Guard      | Request authentication guard                  |
| `api-key.module.ts`            | Module     | NestJS module definition                      |
| `api-key.constants.ts`         | Constants  | Prefix/cache/select fields                    |
| `api-key.types.ts`             | Types      | Validation/Create/List response types         |
| `api-key.decorators.ts`        | Decorators | `@CurrentApiKey` decorator                    |
| `dto/create-api-key.dto.ts`    | DTO        | Create key request schema                     |
| `dto/update-api-key.dto.ts`    | DTO        | Update key request schema                     |

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
Hash key → Check cache → Query database by keyHash
    ↓
Found? → Attach to request context
    ↓
Not found? → 403 Forbidden
```

## Common Modification Scenarios

| Scenario               | Files to Modify                              | Notes                            |
| ---------------------- | -------------------------------------------- | -------------------------------- |
| Add key permission     | `api-key.types.ts`, `api-key.guard.ts`       | Add permission check             |
| Add rate limit per key | `api-key.guard.ts`                           | Integrate with throttler         |
| Add key metadata       | `dto/`, `api-key.service.ts`                 | Update schema and service        |
| Change key format      | `api-key.constants.ts`, `api-key.service.ts` | Keep hash-only + preview in sync |

## Key Methods

```typescript
// Generate new key (plaintext returned only once)
const { plainKey, keyPreview } = await apiKeyService.create(userId, dto);

// Validate key from request
const apiKey = await apiKeyService.validateKey(plaintextKey);

// List user's keys (no plaintext)
const keys = await apiKeyService.findAllByUser(userId);

// Disable key
await apiKeyService.update(userId, keyId, { isActive: false });
```

## Dependencies

```
api-key/
├── prisma/ - 主库存储（ApiKey + ApiKeyCleanupTask）
├── memox-platform/ - tenant teardown 单一事实源
├── queue/ - BullMQ durable cleanup job
├── redis/ - 验证缓存
└── auth/ - User context
```

## Runtime Notes

- `ApiKeyService.delete()` 只负责创建 `ApiKeyCleanupTask` 并投递 job，不再做同步清理。
- `ApiKeyCleanupProcessor` 是正式 worker，不是可选组件；模块 wiring 缺失会直接导致租户数据残留。
- `ApiKeyCleanupService` 只负责任务状态机与 enqueue/recovery；实际 Memox 数据面 teardown 顺序、source/export 对象删除与向量表清理由 `MemoxTenantTeardownService` 持有。

## Key Exports

```typescript
export { ApiKeyModule } from './api-key.module';
export { ApiKeyService } from './api-key.service';
export { ApiKeyGuard } from './api-key.guard';
export { CurrentApiKey } from './api-key.decorators';
```
