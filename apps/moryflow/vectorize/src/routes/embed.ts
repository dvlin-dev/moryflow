/**
 * [INPUT]: EmbedRequest
 * [OUTPUT]: EmbedResponse | ErrorResponse
 * [POS]: 生成 embedding（Workers AI）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新调用方的容量限制与错误处理。
 */

import { Hono } from 'hono';
import type { EmbedRequest, EmbedResponse, Env, ErrorResponse } from '../types';

const embed = new Hono<{ Bindings: Env }>();

type EmbeddingOutput = { data: number[][]; shape: number[] };

embed.post('/', async (c) => {
  const body = await c.req.json<EmbedRequest>();
  const { texts, type = 'document' } = body;

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return c.json<ErrorResponse>({ error: 'texts must be a non-empty array' }, 400);
  }
  if (texts.length > 32) {
    return c.json<ErrorResponse>({ error: 'Max 32 texts per request' }, 400);
  }

  const hasEmptyText = texts.some((t) => typeof t !== 'string' || t.trim() === '');
  if (hasEmptyText) return c.json<ErrorResponse>({ error: 'texts must be non-empty strings' }, 400);

  try {
    const instruction =
      type === 'query'
        ? 'Given a web search query, retrieve relevant passages that answer the query'
        : undefined;

    const result = (await (c.env.AI.run as unknown as (model: string, input: unknown) => Promise<unknown>)(
      c.env.EMBEDDING_MODEL,
      {
      text: texts,
      ...(instruction && { instruction }),
      },
    )) as EmbeddingOutput;

    if (!result.data || !result.shape) throw new Error('Invalid AI response');

    return c.json<EmbedResponse>({
      success: true,
      data: result.data,
      shape: result.shape,
    });
  } catch (error) {
    console.error('Embedding error:', error);
    return c.json<ErrorResponse>(
      { error: 'Embedding failed', details: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});

export default embed;
