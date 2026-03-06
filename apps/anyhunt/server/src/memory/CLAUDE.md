# Memory Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Memox 核心记忆模块（Mem0 V1 对齐）。负责 Memory 的创建、检索、搜索、历史、反馈与导出。

**数据存储**：向量库（`VectorPrismaService`）

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
- enable_graph 时抽取 entities/relations
- LLM 生成 categories/keywords（失败降级）
- includes/excludes/custom_instructions/custom_categories 生效
- Mem0 filters DSL（AND/OR/NOT + gte/lte/in/contains/icontains/\*）
- 写路径事务化：create/update/delete/deleteByFilter/batchUpdate/batchDelete

**Does NOT:**

- 用户认证（api-key/、auth/）
- 配额规则定义（billing/、quota/）
- Console 展示逻辑

## Member List

| File                                          | Type       | Description                          |
| --------------------------------------------- | ---------- | ------------------------------------ |
| `memory.controller.ts`                        | Controller | Public API (ApiKeyGuard)             |
| `memory-batch.controller.ts`                  | Controller | Batch update/delete                  |
| `memory-feedback.controller.ts`               | Controller | Feedback API                         |
| `memory-export.controller.ts`                 | Controller | Export API                           |
| `memory-export.processor.ts`                  | Processor  | Export async worker                  |
| `memory.service.ts`                           | Service    | Core business logic                  |
| `__tests__/memory-entity.integration.spec.ts` | Test       | Memory/Entity integration regression |
| `services/memory-llm.service.ts`              | Service    | LLM inference + tags/graph           |
| `memory.repository.ts`                        | Repository | Vector queries + raw SQL             |
| `filters/memory-filter.builder.ts`            | Helper     | Filters DSL → SQL builder            |
| `memory.module.ts`                            | Module     | NestJS module definition             |
| `filters/memory-filters.types.ts`             | Types      | Shared filters types                 |
| `filters/memory-filters.utils.ts`             | Utils      | DTO/query → filters builder          |
| `utils/memory-mappers.utils.ts`               | Utils      | Response mappers                     |
| `utils/memory-search.utils.ts`                | Utils      | Search rerank helpers                |
| `utils/memory-json.utils.ts`                  | Utils      | Prisma JSON helpers                  |
| `utils/memory-message.utils.ts`               | Utils      | Message filtering + text builder     |
| `dto/memory.schema.ts`                        | Schema     | Zod schemas + inferred types         |
| `dto/index.ts`                                | Export     | DTO exports                          |
| `index.ts`                                    | Export     | Public exports                       |

## API Endpoints

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
