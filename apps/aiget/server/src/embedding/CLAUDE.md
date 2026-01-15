# Embedding Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Vector embedding generation for semantic search. Converts text content into vector representations using OpenAI embeddings.

## Responsibilities

**Does:**

- Text to vector embedding conversion
- Batch embedding generation

**Does NOT:**

- Vector storage (handled by memory/ with pgvector)
- Similarity search (handled by memory/)
- LLM text generation (handled by llm/)

## Member List

| File                   | Type    | Description                |
| ---------------------- | ------- | -------------------------- |
| `embedding.service.ts` | Service | Embedding generation logic |
| `embedding.module.ts`  | Module  | NestJS module definition   |
| `index.ts`             | Export  | Public exports             |

## Provider Configuration

```typescript
// Environment variables
OPENAI_API_KEY=...
EMBEDDING_API_URL=...      // optional (OpenAI-compatible endpoint)
EMBEDDING_MODEL=...        // optional (default: text-embedding-3-small)
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
├── depended by ← memory/ (content embedding)
└── depended by ← extract/ (query embedding)
```

## Testing Notes

- `openai` 是 ESM 依赖；单测需要在 `vi.mock('openai', ...)` 生效后再加载 `EmbeddingService`，避免误触发真实网络请求。
- 当前做法：在 `src/embedding/__tests__/embedding.service.spec.ts` 中使用 `vi.resetModules()` + 动态 `import('../embedding.service')`。

---

_See [apps/aiget/server/CLAUDE.md](../../CLAUDE.md) for server conventions_
