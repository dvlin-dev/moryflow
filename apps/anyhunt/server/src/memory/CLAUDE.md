# Memory Module

> Warning: When this folder structure changes, you MUST update this document

## Position

当前 `memory/` 目录负责 **原子记忆（MemoryFact）** 相关能力，不再应承担整个开放检索平台的全部职责。

目标态边界：

- `memory/`：长期记忆、偏好、事实、history、feedback
- `sources/`：知识源、版本、normalized text、chunk、后续 source search
- `scope-registry/`：`user/agent/app/run` 作用域投影
- `graph/`：`GraphEntity / GraphRelation / GraphObservation`

`memory/` 自身不应该继续扩张成“文档检索 + 图谱 + source 生命周期 + 全平台 orchestration”的大模块。

**数据存储**：向量库 `MemoryFact*` 独立事实源已落地（`MemoryFact / MemoryFactHistory / MemoryFactFeedback / MemoryFactExport`）

## Responsibilities

**Does:**

- Memory 创建（可选 LLM 推断）+ embedding 生成
- 语义搜索（pgvector）与关键词搜索
- Memory 列表、详情、更新、删除
- Batch update/delete
- Memory history 与 feedback
- 更新场景重新计算 hash
- Export 队列异步导出（BullMQ + R2）
- Export payload 通过 `Readable.from(async generator)` 流式上传，避免全量拼接内存
- 默认过滤过期 memory（`expirationDate`）
- `graphEnabled` 为真时投递异步 graph projection
- LLM 生成 categories/keywords（失败降级）
- includes/excludes/custom_instructions/custom_categories 生效
- Mem0 filters DSL（AND/OR/NOT + gte/lte/in/contains/icontains/\*）
- 写路径事务化：create/update/delete/deleteByFilter/batchUpdate/batchDelete
- `POST /v1/memories` 已接入 `Idempotency-Key`（控制器层通过 `IdempotencyExecutorService` 统一处理首次执行/回放/处理中冲突）
- `POST /v1/exports` 已接入同一套 `Idempotency-Key` 主链路
- graph 证据不再写入 `MemoryFact` 主表；主表只保留 `graphEnabled`

**Does NOT:**

- 用户认证（api-key/、auth/）
- 配额规则定义（billing/、quota/）
- Console 展示逻辑
- Moryflow 专用私有协议（Moryflow Server 必须复用未来对外公开的同一套 Memox API 契约）
- Source 摄入、文件 chunk 检索、source/file 聚合结果（这些已开始进入独立 `sources/` 域）
- Graph canonical projection（这些应进入独立 `graph/` 域）

## Member List

| File                                          | Type       | Description                                     |
| --------------------------------------------- | ---------- | ----------------------------------------------- |
| `memory.controller.ts`                        | Controller | Public API (ApiKeyGuard)                        |
| `memory-batch.controller.ts`                  | Controller | Batch update/delete                             |
| `memory-feedback.controller.ts`               | Controller | Feedback API                                    |
| `memory-export.controller.ts`                 | Controller | Export API                                      |
| `memory-export.processor.ts`                  | Processor  | Export async worker                             |
| `memory.service.ts`                           | Service    | Core business logic                             |
| `__tests__/memory-entity.integration.spec.ts` | Test       | MemoryFact/ScopeRegistry integration regression |
| `services/memory-llm.service.ts`              | Service    | LLM inference + tags/graph                      |
| `memory.repository.ts`                        | Repository | Vector queries + raw SQL                        |
| `filters/memory-filter.builder.ts`            | Helper     | Filters DSL → SQL builder                       |
| `memory.module.ts`                            | Module     | NestJS module definition                        |
| `filters/memory-filters.types.ts`             | Types      | Shared filters types                            |
| `filters/memory-filters.utils.ts`             | Utils      | DTO/query → filters builder                     |
| `utils/memory-mappers.utils.ts`               | Utils      | Response mappers                                |
| `utils/memory-search.utils.ts`                | Utils      | Search rerank helpers                           |
| `utils/memory-json.utils.ts`                  | Utils      | Prisma JSON helpers                             |
| `utils/memory-message.utils.ts`               | Utils      | Message filtering + text builder                |
| `dto/memory.schema.ts`                        | Schema     | Zod schemas + inferred types                    |
| `dto/index.ts`                                | Export     | DTO exports                                     |
| `index.ts`                                    | Export     | Public exports                                  |

## API Endpoints（当前）

```
Public API (v1) - ApiKeyGuard:
  POST   /v1/memories
  GET    /v1/memories
  DELETE /v1/memories
  POST   /v1/memories/search
  GET    /v1/memories/:memoryId
  PUT    /v1/memories/:memoryId
  DELETE /v1/memories/:memoryId
  GET    /v1/memories/:memoryId/history
  GET    /v1/memories/:entityType/:entityId

  PUT    /v1/batch
  DELETE /v1/batch
  POST   /v1/feedback
  POST   /v1/exports
  POST   /v1/exports/get
```

## Key Schemas

```typescript
// Search/List 兼容 categories/fields: string | string[]
SearchMemorySchema = {
  query: string,
  categories?: string | string[],
  fields?: string | string[],
  // ...
}

ListMemoryQuerySchema = {
  categories?: string | string[],
  fields?: string | string[],
  // ...
}

// ExportCreate 收口：移除 schema 字段（strict）
ExportCreateSchema = {
  filters?: Record<string, JsonValue>,
  org_id?: string,
  project_id?: string,
}
```

## Common Modification Scenarios

| Scenario               | Files                                                      | Notes                                             |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| Add search filter      | `memory.repository.ts`, `dto/memory.schema.ts`             | Add schema first                                  |
| Add filters DSL op     | `filters/memory-filter.builder.ts`, `memory.repository.ts` | Update parse + SQL builder + tests                |
| Adjust JSON payloads   | `utils/memory-json.utils.ts`                               | Use `toJsonValue` / `toNullableInputJson` helpers |
| Change export behavior | `memory.service.ts`, `memory-export.processor.ts`          | Keep queue + status flow consistent               |
| Edit raw SQL           | `memory.repository.ts`                                     | Use Prisma column names (`"apiKeyId"`, etc.)      |

## Refactor Notes

- 不要把 `document_chunk` 直接并入当前 `Memory` 主模型；最佳实践是独立 `SourceChunk`。
- 不要把 graph entity/relation 快照重新塞回 `MemoryFact` 主表；图谱证据只允许落在 `graph/` 域。
- 如果需要替代 Moryflow `vectorize/search`，应新增独立 `sources/` 检索域，而不是继续扩大 `memory.service.ts`。

## Dependencies

```
memory/
├── depends on → embedding/ (vector generation)
├── depends on → vector-prisma/ (Memory storage)
├── depends on → billing/ (quota deduction/refund)
├── depends on → llm/ (infer + graph extraction)
├── depends on → queue/ (export async jobs)
└── depends on → storage/ (R2 export storage)
```

---

_See [apps/anyhunt/server/CLAUDE.md](../../CLAUDE.md) for server conventions_
