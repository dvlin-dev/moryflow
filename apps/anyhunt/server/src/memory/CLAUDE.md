# Memory Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Core memory service for the Memox platform. Handles memory CRUD operations, semantic search, and embedding generation.

**数据存储**：向量库（`VectorPrismaService`）

## Responsibilities

**Does:**

- Memory creation with automatic embedding generation
- Semantic search using pgvector similarity
- Memory listing, retrieval, and deletion
- Console export as JSON/CSV
- 跨库查询：Console 接口从主库查 ApiKey，从向量库查 Memory，应用层组装

**Does NOT:**

- User authentication (handled by api-key/, auth/)
- Quota management (handled by quota/)
- Direct LLM calls (handled by llm/, extract/)

## Member List

| File                           | Type       | Description                        |
| ------------------------------ | ---------- | ---------------------------------- |
| `memory.controller.ts`         | Controller | Public API endpoints (ApiKeyGuard) |
| `console-memory.controller.ts` | Controller | Console endpoints (SessionGuard)   |
| `memory.service.ts`            | Service    | Core business logic                |
| `memory.repository.ts`         | Repository | Database queries with pgvector     |
| `memory.module.ts`             | Module     | NestJS module definition           |
| `memory.errors.ts`             | Errors     | MemoryNotFoundError, etc.          |
| `dto/memory.schema.ts`         | Schema     | Zod schemas + inferred types       |
| `dto/index.ts`                 | Export     | DTO exports                        |
| `index.ts`                     | Export     | Public module exports              |

## API Endpoints

```
Public API (v1) - ApiKeyGuard:
  POST   /v1/memories           # Create memory
  POST   /v1/memories/search    # Semantic search
  GET    /v1/memories           # List with pagination
  GET    /v1/memories/:id       # Get by ID
  DELETE /v1/memories/:id       # Delete memory

Console API - SessionGuard:
  GET    /api/v1/console/memories  # List for console
  GET    /api/v1/console/memories/export # Export as JSON/CSV
```

## Key Schemas

```typescript
// Create memory
CreateMemorySchema = {
  content: string,           // Required, 1-10000 chars
  userId: string,            // Required user context
  agentId?: string,          // Optional agent context
  metadata?: Record<string, JsonValue>,
  tags?: string[],
  importance?: number        // 0-1 scale
}

// Search memory
SearchMemorySchema = {
  query: string,             // Search query
  limit?: number,            // Default 10, max 100
  threshold?: number,        // Similarity threshold 0-1
  userId: string,            // Filter by user
  tags?: string[]            // Filter by tags
}
```

## Common Modification Scenarios

| Scenario               | Files                                          | Notes                                                              |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| Add search filter      | `memory.repository.ts`, `dto/memory.schema.ts` | Add to schema first                                                |
| Change embedding logic | `memory.service.ts`                            | Calls embedding.service                                            |
| Add new endpoint       | `memory.controller.ts`, `dto/memory.schema.ts` | Add schema + controller                                            |
| Add error type         | `memory.errors.ts`                             | Extend MemoryError base                                            |
| Edit raw SQL           | `memory.repository.ts`                         | Use Prisma column names (`"apiKeyId"`, `"userId"`), not snake_case |

## Dependencies

```
memory/
├── depends on → embedding/ (vector generation)
├── depends on → vector-prisma/ (向量库 - Memory 存储)
├── depends on → prisma/ (主库 - Console 跨库查询 ApiKey)
└── depends on → billing/ (quota deduction/refund rules)
```

---

_See [apps/anyhunt/server/CLAUDE.md](../../CLAUDE.md) for server conventions_
