# Extract Module

> Warning: When this folder structure changes, you MUST update this document

## Position

LLM-based content extraction. Uses language models to extract structured information (entities, relations) from text.

## Responsibilities

**Does:**
- Entity extraction from text
- Relation extraction between entities
- Structured data extraction with prompts

**Does NOT:**
- Vector embeddings (handled by embedding/)
- Entity storage (handled by entity/)
- Relation storage (handled by relation/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `extract.controller.ts` | Controller | Extraction API endpoints |
| `extract.service.ts` | Service | LLM extraction logic |
| `extract.module.ts` | Module | NestJS module definition |
| `dto/extract.schema.ts` | Schema | Zod schemas + DTOs |
| `dto/index.ts` | Export | DTO exports |
| `index.ts` | Export | Public exports |

## Extraction Flow

```
1. Receive text content
2. Build extraction prompt
3. Call LLM via llm.service
4. Parse structured response
5. Return extracted entities/relations
```

## Dependencies

```
extract/
├── depends on → llm/ (LLM calls)
├── depended by ← entity/ (entity extraction)
└── depended by ← relation/ (relation extraction)
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
