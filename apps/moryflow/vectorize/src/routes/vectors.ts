/**
 * [INPUT]: UpsertRequest | QueryRequest | DeleteRequest
 * [OUTPUT]: UpsertResponse | QueryResponse | DeleteResponse | ErrorResponse
 * [POS]: Vectorize 索引操作（upsert/query/delete）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新调用方的输入约束与 namespace/filter 约定。
 */

import { Hono } from 'hono';
import type {
  DeleteRequest,
  DeleteResponse,
  Env,
  ErrorResponse,
  QueryRequest,
  QueryResponse,
  UpsertRequest,
  UpsertResponse,
} from '../types';

const vectors = new Hono<{ Bindings: Env }>();

type EmbeddingOutput = { data: number[][]; shape: number[] };

vectors.post('/upsert', async (c) => {
  const body = await c.req.json<UpsertRequest>();
  const { vectors: inputVectors } = body;

  if (!inputVectors || !Array.isArray(inputVectors) || inputVectors.length === 0) {
    return c.json<ErrorResponse>({ error: 'vectors must be a non-empty array' }, 400);
  }
  if (inputVectors.length > 32) return c.json<ErrorResponse>({ error: 'Max 32 vectors per request' }, 400);

  for (const vector of inputVectors) {
    if (!vector.id || typeof vector.id !== 'string') return c.json<ErrorResponse>({ error: 'Missing vector id' }, 400);
    if (!vector.text || typeof vector.text !== 'string' || vector.text.trim() === '') {
      return c.json<ErrorResponse>({ error: 'Missing vector text' }, 400);
    }
  }

  try {
    const texts = inputVectors.map((v) => v.text);
    const embedResult = (await (c.env.AI.run as unknown as (model: string, input: unknown) => Promise<unknown>)(
      c.env.EMBEDDING_MODEL,
      { text: texts },
    )) as EmbeddingOutput;
    if (!embedResult.data) throw new Error('Invalid AI response');

    const vectorizeVectors: VectorizeVector[] = inputVectors.map((v, i) => ({
      id: v.id,
      values: embedResult.data![i],
      metadata: v.metadata,
      namespace: v.namespace,
    }));

    const result = await c.env.VECTOR_INDEX.upsert(vectorizeVectors);
    return c.json<UpsertResponse>({
      success: true,
      mutationId: result.ids?.join(',') ?? '',
      count: inputVectors.length,
    });
  } catch (error) {
    console.error('Upsert error:', error);
    return c.json<ErrorResponse>(
      { error: 'Upsert failed', details: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});

vectors.post('/query', async (c) => {
  const body = await c.req.json<QueryRequest>();
  const { text, topK = 10, namespace, filter } = body;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return c.json<ErrorResponse>({ error: 'text must be a non-empty string' }, 400);
  }
  if (topK < 1 || topK > 100) return c.json<ErrorResponse>({ error: 'topK must be 1-100' }, 400);

  try {
    const embedResult = (await (c.env.AI.run as unknown as (model: string, input: unknown) => Promise<unknown>)(
      c.env.EMBEDDING_MODEL,
      { text: [text], instruction: 'Given a web search query, retrieve relevant passages that answer the query' },
    )) as EmbeddingOutput;

    if (!embedResult.data?.[0]) throw new Error('Invalid AI response');

    const result = await c.env.VECTOR_INDEX.query(embedResult.data[0], {
      topK,
      namespace,
      filter,
      returnMetadata: 'all',
      returnValues: false,
    });

    return c.json<QueryResponse>({
      success: true,
      matches: result.matches.map((m) => ({
        id: m.id,
        score: m.score,
        metadata: m.metadata as QueryResponse['matches'][number]['metadata'],
      })),
      count: result.count,
    });
  } catch (error) {
    console.error('Query error:', error);
    return c.json<ErrorResponse>(
      { error: 'Query failed', details: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});

vectors.delete('/', async (c) => {
  const body = await c.req.json<DeleteRequest>();
  const { ids } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) return c.json<ErrorResponse>({ error: 'ids must be a non-empty array' }, 400);

  const invalidIds = ids.filter((id) => typeof id !== 'string' || id.trim() === '');
  if (invalidIds.length > 0) return c.json<ErrorResponse>({ error: 'ids must be non-empty strings' }, 400);

  try {
    const result = await c.env.VECTOR_INDEX.deleteByIds(ids);
    return c.json<DeleteResponse>({
      success: true,
      mutationId: result.ids?.join(',') ?? '',
      count: ids.length,
    });
  } catch (error) {
    console.error('Delete error:', error);
    return c.json<ErrorResponse>(
      { error: 'Delete failed', details: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});

export default vectors;
