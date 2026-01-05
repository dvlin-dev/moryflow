# Memory Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Core memory service for the Memai platform. Handles memory CRUD operations, semantic search, embedding generation, and entity/relation extraction.

## Responsibilities

**Does:**
- Memory creation with automatic embedding generation
- Semantic search using pgvector similarity
- Memory listing, retrieval, and deletion
- Entity and relation extraction triggering
- Webhook notification on memory events
- Cache management for search results

**Does NOT:**
- User authentication (handled by api-key/, auth/)
- Quota management (handled by quota/)
- Direct LLM calls (handled by llm/, extract/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `memory.controller.ts` | Controller | Public API endpoints (ApiKeyGuard) |
| `console-memory.controller.ts` | Controller | Console endpoints (SessionGuard) |
| `memory.service.ts` | Service | Core business logic |
| `memory.repository.ts` | Repository | Database queries with pgvector |
| `memory.module.ts` | Module | NestJS module definition |
| `memory.errors.ts` | Errors | MemoryNotFoundError, etc. |
| `dto/memory.schema.ts` | Schema | Zod schemas + DTO classes |
| `dto/index.ts` | Export | DTO exports |
| `index.ts` | Export | Public module exports |

## API Endpoints

```
Public API (v1) - ApiKeyGuard:
  POST   /v1/memories           # Create memory
  POST   /v1/memories/search    # Semantic search
  GET    /v1/memories           # List with pagination
  GET    /v1/memories/:id       # Get by ID
  DELETE /v1/memories/:id       # Delete memory

Console API - SessionGuard:
  GET    /api/console/memories  # List for console
  GET    /api/console/memories/export # Export as JSON/CSV
```

## Key Schemas

```typescript
// Create memory
CreateMemorySchema = {
  content: string,           // Required, 1-10000 chars
  userId?: string,           // Optional user context
  agentId?: string,          // Optional agent context
  metadata?: Record<string, unknown>,
  tags?: string[],
  importance?: number        // 0-1 scale
}

// Search memory
SearchMemorySchema = {
  query: string,             // Search query
  limit?: number,            // Default 10, max 100
  threshold?: number,        // Similarity threshold 0-1
  userId?: string,           // Filter by user
  tags?: string[]            // Filter by tags
}
```

## Common Modification Scenarios

| Scenario | Files | Notes |
|----------|-------|-------|
| Add search filter | `memory.repository.ts`, `dto/memory.schema.ts` | Add to schema first |
| Change embedding logic | `memory.service.ts` | Calls embedding.service |
| Add new endpoint | `memory.controller.ts`, `dto/memory.schema.ts` | Add schema + controller |
| Add error type | `memory.errors.ts` | Extend MemoryError base |

## Dependencies

```
memory/
├── depends on → embedding/ (vector generation)
├── depends on → entity/ (entity extraction)
├── depends on → relation/ (relation extraction)
├── depends on → prisma/ (database)
├── depends on → redis/ (caching)
├── depends on → quota/ (usage tracking)
├── depends on → webhook/ (event notifications)
└── depended by ← graph/ (knowledge graph queries)
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
