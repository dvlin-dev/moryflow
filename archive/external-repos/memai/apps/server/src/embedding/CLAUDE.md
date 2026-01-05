# Embedding Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Vector embedding generation for semantic search. Converts text content into vector representations using OpenAI or Aliyun embedding APIs.

## Responsibilities

**Does:**
- Text to vector embedding conversion
- Embedding provider abstraction (OpenAI, Aliyun)
- Batch embedding generation
- Embedding caching

**Does NOT:**
- Vector storage (handled by memory/ with pgvector)
- Similarity search (handled by memory/)
- LLM text generation (handled by llm/)

## Member List

| File | Type | Description |
|------|------|-------------|
| `embedding.service.ts` | Service | Embedding generation logic |
| `embedding.module.ts` | Module | NestJS module definition |
| `index.ts` | Export | Public exports |

## Provider Configuration

```typescript
// Environment variables
EMBEDDING_PROVIDER=openai  // or 'aliyun'
OPENAI_API_KEY=...
ALIYUN_API_KEY=...
```

## Usage

```typescript
// In memory.service.ts
const embedding = await this.embeddingService.generate(content);
// Returns: number[] (1536-dimensional vector for OpenAI)
```

## Dependencies

```
embedding/
├── depends on → redis/ (caching)
├── depended by ← memory/ (content embedding)
└── depended by ← extract/ (query embedding)
```

---

*See [apps/server/CLAUDE.md](../CLAUDE.md) for server conventions*
