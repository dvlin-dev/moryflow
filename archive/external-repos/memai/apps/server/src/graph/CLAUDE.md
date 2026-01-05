# Graph Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Knowledge graph operations. Provides graph traversal and querying capabilities over entities and relations.

## Responsibilities

**Does:**
- Graph traversal queries
- Path finding between entities
- Subgraph extraction
- Graph visualization data

**Does NOT:**
- Entity management (handled by entity/)
- Relation management (handled by relation/)
- Memory operations (handled by memory/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `graph.controller.ts` | Controller | Graph API endpoints |
| `graph.service.ts` | Service | Graph query logic |
| `graph.module.ts` | Module | NestJS module definition |
| `dto/graph.schema.ts` | Schema | Zod schemas + DTOs |
| `dto/index.ts` | Export | DTO exports |
| `index.ts` | Export | Public exports |

## Dependencies

```
graph/
├── depends on → entity/ (entity data)
├── depends on → relation/ (relation data)
├── depends on → memory/ (memory context)
└── depends on → prisma/ (database)
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
