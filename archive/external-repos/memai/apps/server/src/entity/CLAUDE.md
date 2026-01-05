# Entity Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Entity extraction and management. Extracts named entities (people, places, concepts) from memories using LLM.

## Responsibilities

**Does:**
- Entity extraction from memory content
- Entity CRUD operations
- Entity linking across memories
- Entity type classification

**Does NOT:**
- Relation extraction (handled by relation/)
- Memory storage (handled by memory/)
- LLM calls directly (handled by extract/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `entity.controller.ts` | Controller | Public API endpoints |
| `console-entity.controller.ts` | Controller | Console endpoints |
| `entity.service.ts` | Service | Entity business logic |
| `entity.repository.ts` | Repository | Database operations |
| `entity.module.ts` | Module | NestJS module definition |
| `entity.errors.ts` | Errors | Custom error classes |
| `dto/entity.schema.ts` | Schema | Zod schemas + DTOs |
| `dto/index.ts` | Export | DTO exports |
| `index.ts` | Export | Public exports |

## Dependencies

```
entity/
├── depends on → extract/ (LLM extraction)
├── depends on → prisma/ (database)
├── depended by ← memory/ (entity linking)
└── depended by ← graph/ (knowledge graph)
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
