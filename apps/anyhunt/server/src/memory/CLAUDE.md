# Memory Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Memox 核心记忆模块（Mem0 V1 对齐）。负责 Memory 的创建、检索、搜索、历史与导出，并可用 LLM 抽取实体/关系。

**数据存储**：向量库（`VectorPrismaService`）

## Responsibilities

**Does:**

- Memory 创建（可选 LLM 推断）+ embedding 生成
- 语义搜索（pgvector）
- Memory 列表、详情、更新、删除
- Batch update/delete
- Memory history 与 feedback
- Update/batch update 会重新计算 hash
- Memory export（R2 存储）
- enable_graph 时抽取 entities/relations
- LLM 生成 categories/keywords（失败时降级为关键词抽取）
- LLM 调用使用 @openai/agents-core ModelRequest/ModelResponse（默认模型设置）
- includes/excludes/custom_instructions/custom_categories 生效
- async_mode 控制并行处理
- Mem0 filters DSL（AND/OR/NOT + gte/lte/in/contains/icontains/\*）
- JSON 字段写入使用 InputJsonValue/DbNull（见 utils/memory-json.utils.ts）

**Does NOT:**

- 用户认证（api-key/、auth/）
- 配额管理（billing/、quota/）
- 前端聚合展示（console/）

## Member List

| File                               | Type       | Description                      |
| ---------------------------------- | ---------- | -------------------------------- |
| `memory.controller.ts`             | Controller | Public API (ApiKeyGuard)         |
| `memory-batch.controller.ts`       | Controller | Batch update/delete              |
| `memory-feedback.controller.ts`    | Controller | Feedback API                     |
| `memory-export.controller.ts`      | Controller | Export API                       |
| `memory.service.ts`                | Service    | Core business logic              |
| `services/memory-llm.service.ts`   | Service    | LLM inference + tags/graph       |
| `memory.repository.ts`             | Repository | Vector queries + raw SQL         |
| `filters/memory-filter.builder.ts` | Helper     | Filters DSL → SQL builder        |
| `memory.module.ts`                 | Module     | NestJS module definition         |
| `filters/memory-filters.types.ts`  | Types      | Shared filters types             |
| `filters/memory-filters.utils.ts`  | Utils      | DTO/query → filters builder      |
| `utils/memory-mappers.utils.ts`    | Utils      | Response mappers                 |
| `utils/memory-search.utils.ts`     | Utils      | Search rerank helpers            |
| `utils/memory-json.utils.ts`       | Utils      | Prisma JSON helpers              |
| `utils/memory-message.utils.ts`    | Utils      | Message filtering + text builder |
| `dto/memory.schema.ts`             | Schema     | Zod schemas + inferred types     |
| `dto/index.ts`                     | Export     | DTO exports                      |
| `index.ts`                         | Export     | Public exports (core + helpers)  |

## API Endpoints

```
Public API (v1) - ApiKeyGuard:
  POST   /v1/memories                 # Create memory
  GET    /v1/memories                 # List memories
  DELETE /v1/memories                 # Delete by filter
  POST   /v1/memories/search          # Semantic search
  GET    /v1/memories/:memoryId       # Get by ID
  PUT    /v1/memories/:memoryId       # Update memory
  DELETE /v1/memories/:memoryId       # Delete memory
  GET    /v1/memories/:memoryId/history # Memory history
  GET    /v1/memories/:entityType/:entityId # Memories by entity

  PUT    /v1/batch                    # Batch update
  DELETE /v1/batch                    # Batch delete
  POST   /v1/feedback                 # Submit feedback
  POST   /v1/exports                  # Create export
  POST   /v1/exports/get              # Get export
```

## Key Schemas

```typescript
// Create memory (Mem0 v1)
CreateMemorySchema = {
  messages: [{ role, content, ... }],
  user_id?: string,
  agent_id?: string,
  app_id?: string,
  run_id?: string,
  metadata?: Record<string, JsonValue>,
  includes?: string,
  excludes?: string,
  custom_categories?: Record<string, JsonValue>,
  custom_instructions?: string,
  infer?: boolean,
  output_format?: 'v1.0' | 'v1.1',
  immutable?: boolean,
  async_mode?: boolean,
  timestamp?: number,
  expiration_date?: string,
  enable_graph?: boolean,
  org_id?: string,
  project_id?: string
}

// Search memory (Mem0 v1)
SearchMemorySchema = {
  query: string,
  user_id?: string,
  agent_id?: string,
  app_id?: string,
  run_id?: string,
  metadata?: Record<string, JsonValue>,
  filters?: object | string,
  categories?: string[],
  top_k?: number,
  threshold?: number,
  output_format?: 'v1.0' | 'v1.1',
  keyword_search?: boolean,
  rerank?: boolean,
  filter_memories?: boolean,
  only_metadata_based_search?: boolean
}

// List memories (Mem0 v1)
ListMemoryQuerySchema = {
  user_id?: string,
  agent_id?: string,
  app_id?: string,
  run_id?: string,
  filters?: object | string,
  categories?: string[],
  keywords?: string,
  page?: number,
  page_size?: number,
  start_date?: string,
  end_date?: string
}

// List memories 支持分页与过滤，无需强制实体过滤
```

## Common Modification Scenarios

| Scenario               | Files                                                      | Notes                                              |
| ---------------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| Add search filter      | `memory.repository.ts`, `dto/memory.schema.ts`             | Add to schema first                                |
| Add filters DSL op     | `filters/memory-filter.builder.ts`, `memory.repository.ts` | Update parse + SQL builder + tests                 |
| Adjust JSON payloads   | `utils/memory-json.utils.ts`                               | Use toJsonValue / toNullableInputJson helpers      |
| Change embedding logic | `memory.service.ts`, `embedding.service.ts`                | Embedding dims fixed 1536                          |
| Add new endpoint       | `memory.controller.ts`, `dto/memory.schema.ts`             | Add schema + controller                            |
| Edit raw SQL           | `memory.repository.ts`                                     | Use Prisma column names (`"apiKeyId"`, `"userId"`) |

## Dependencies

```
memory/
├── depends on → embedding/ (vector generation)
├── depends on → vector-prisma/ (向量库 - Memory 存储)
├── depends on → billing/ (quota deduction/refund)
├── depends on → llm/ (infer + graph extraction)
└── depends on → storage/ (R2 export storage)
```

---

_See [apps/anyhunt/server/CLAUDE.md](../../CLAUDE.md) for server conventions_
