# Embedding Module

> Warning: When this folder structure changes, you MUST update this document

## Position

Vector embedding generation for semantic search. Converts text content into vector representations using OpenAI-compatible embeddings, and only sends provider dimensions when explicitly configured.

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
EMBEDDING_OPENAI_API_KEY=...     // required
EMBEDDING_OPENAI_BASE_URL=...    // optional (OpenAI-compatible endpoint)
EMBEDDING_OPENAI_MODEL=...       // optional (default: text-embedding-3-small)
EMBEDDING_OPENAI_DIMENSIONS=...  // optional (explicitly pass provider dimensions; default expected value: 1536)
```

当前约束：

- 仅当显式配置 `EMBEDDING_OPENAI_DIMENSIONS` 时，服务端才会把 `dimensions` 传给 provider。
- 未显式配置时，服务端仍以 `1536` 作为默认预期维度，并校验 provider 返回值是否匹配。
- 切换到 OpenRouter / Qwen 之类支持可变维度的模型时，必须保持 env 维度与向量库预期一致。

## Usage

```typescript
// In memory.service.ts
const embedding = await this.embeddingService.generate(content);
// Returns: number[] (expected-dimensional vector, default 1536)
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
