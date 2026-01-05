# Relation Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Entity relation management. Creates and manages relationships between entities to build knowledge graphs.

## Responsibilities

**Does:**
- Relation creation between entities
- Relation type management
- Relation querying and filtering
- Bidirectional relation handling

**Does NOT:**
- Entity extraction (handled by entity/)
- Graph traversal (handled by graph/)
- Memory operations (handled by memory/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `relation.controller.ts` | Controller | API endpoints |
| `relation.service.ts` | Service | Relation business logic |
| `relation.repository.ts` | Repository | Database operations |
| `relation.module.ts` | Module | NestJS module definition |
| `relation.errors.ts` | Errors | Custom error classes |
| `dto/relation.schema.ts` | Schema | Zod schemas + DTOs |
| `dto/index.ts` | Export | DTO exports |
| `index.ts` | Export | Public exports |

## Dependencies

```
relation/
├── depends on → entity/ (entity references)
├── depends on → prisma/ (database)
└── depended by ← graph/ (knowledge graph)
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
