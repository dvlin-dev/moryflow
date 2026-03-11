import { describe, expect, it, vi } from 'vitest';
import { MemoryClient } from './memory.client';
import type { MemoxClient } from '../memox';
import { AnyhuntMemoryCreateResponseSchema } from './dto/memory.dto';

describe('MemoryClient', () => {
  type MockFn<T extends (...args: any[]) => any> = ReturnType<typeof vi.fn<T>>;
  type RequestJsonMock = MockFn<MemoxClient['requestJson']>;

  const createClient = (requestJson: RequestJsonMock) =>
    new MemoryClient({
      requestJson,
    } as unknown as MemoxClient);

  it('maps includeGraphContext to Anyhunt retrieval snake_case payload', async () => {
    const requestJson: RequestJsonMock = vi.fn().mockResolvedValue({
      groups: {
        files: { items: [], returned_count: 0, hasMore: false },
        facts: { items: [], returned_count: 0, hasMore: false },
      },
    });
    const client = createClient(requestJson);

    await client.searchRetrieval({
      query: 'alpha',
      includeGraphContext: true,
      scope: {
        user_id: 'user-1',
        project_id: 'vault-1',
      },
      group_limits: {
        sources: 5,
        memory_facts: 5,
      },
    });

    expect(requestJson.mock.calls[0]?.[0]).toMatchObject({
      path: '/api/v1/retrieval/search',
      method: 'POST',
      body: {
        query: 'alpha',
        include_graph_context: true,
        scope: {
          user_id: 'user-1',
          project_id: 'vault-1',
        },
        group_limits: {
          sources: 5,
          memory_facts: 5,
        },
      },
    });
  });

  it('serializes metadata scope for graph entity detail requests', async () => {
    const requestJson: RequestJsonMock = vi.fn().mockResolvedValue({
      entity: {
        id: 'entity-1',
        entity_type: 'person',
        canonical_name: 'Alice',
        aliases: [],
        metadata: null,
        last_seen_at: null,
        incoming_relations: [],
        outgoing_relations: [],
      },
      evidence_summary: {
        observation_count: 0,
        source_count: 0,
        memory_fact_count: 0,
        latest_observed_at: null,
      },
      recent_observations: [],
    });
    const client = createClient(requestJson);

    await client.getGraphEntityDetail('entity-1', {
      user_id: 'user-1',
      project_id: 'vault-1',
      metadata: {
        topic: 'alpha',
        nested: {
          level: 'deep',
        },
      },
    });

    expect(requestJson.mock.calls[0]?.[0]?.path).toContain(
      '/api/v1/graph/entities/entity-1?user_id=user-1&project_id=vault-1&metadata%5Btopic%5D=alpha&metadata%5Bnested%5D%5Blevel%5D=deep',
    );
  });

  it('forwards idempotency keys for memory create and export create requests', async () => {
    const requestJson: RequestJsonMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: [],
      })
      .mockResolvedValueOnce({
        memory_export_id: 'export-1',
      });
    const client = createClient(requestJson);

    await client.createMemory({
      idempotency_key: 'idem-memory-1',
      messages: [{ role: 'user', content: 'alpha' }],
      infer: false,
      async_mode: false,
      user_id: 'user-1',
      project_id: 'vault-1',
    });
    await client.createExport({
      idempotency_key: 'idem-export-1',
      project_id: 'vault-1',
      filters: {
        user_id: 'user-1',
      },
    });

    expect(requestJson.mock.calls[0]?.[0]).toMatchObject({
      path: '/api/v1/memories',
      method: 'POST',
      idempotencyKey: 'idem-memory-1',
    });
    expect(requestJson.mock.calls[1]?.[0]).toMatchObject({
      path: '/api/v1/exports',
      method: 'POST',
      idempotencyKey: 'idem-export-1',
    });
  });

  it('parses raw array responses for list memories', async () => {
    const requestJson: RequestJsonMock = vi.fn().mockResolvedValue([
      {
        id: 'fact-1',
        content: 'alpha',
        metadata: null,
        categories: [],
        immutable: false,
        origin_kind: 'MANUAL',
        source_id: null,
        source_revision_id: null,
        derived_key: null,
        expiration_date: null,
        user_id: 'user-1',
        project_id: 'vault-1',
        created_at: '2026-03-11T12:00:00.000Z',
        updated_at: '2026-03-11T12:00:00.000Z',
      },
    ]);
    const client = createClient(requestJson);

    const result = await client.listMemories({
      user_id: 'user-1',
      project_id: 'vault-1',
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: 'fact-1',
        content: 'alpha',
      }),
    ]);
  });

  it('parses create memory responses as result envelopes', async () => {
    const transformedResponse = AnyhuntMemoryCreateResponseSchema.transform(
      (value) => value.results,
    ).parse({
      results: [
        {
          id: 'fact-1',
          data: {
            content: 'alpha',
          },
          event: 'ADD',
        },
      ],
    });
    const requestJson: RequestJsonMock = vi
      .fn()
      .mockResolvedValue(transformedResponse);
    const client = createClient(requestJson);

    const result = await client.createMemory({
      idempotency_key: 'idem-memory-1',
      messages: [{ role: 'user', content: 'alpha' }],
      infer: false,
      async_mode: false,
      user_id: 'user-1',
      project_id: 'vault-1',
    });

    expect(
      requestJson.mock.calls[0]?.[0]?.schema.parse({
        results: [
          {
            id: 'fact-1',
            data: {
              content: 'alpha',
            },
            event: 'ADD',
          },
        ],
      }),
    ).toEqual(transformedResponse);
    expect(result).toEqual([
      {
        id: 'fact-1',
        data: {
          content: 'alpha',
        },
        event: 'ADD',
      },
    ]);
  });

  it('parses history items with old_content and new_content fields', async () => {
    const requestJson: RequestJsonMock = vi.fn().mockResolvedValue([
      {
        id: 'history-1',
        memory_id: 'fact-1',
        event: 'ADD',
        old_content: null,
        new_content: 'alpha',
        metadata: null,
        input: null,
        created_at: '2026-03-11T12:00:00.000Z',
        user_id: 'user-1',
      },
    ]);
    const client = createClient(requestJson);

    const result = await client.getMemoryHistory('fact-1');

    expect(result).toEqual([
      expect.objectContaining({
        memory_id: 'fact-1',
        old_content: null,
        new_content: 'alpha',
      }),
    ]);
  });
});
