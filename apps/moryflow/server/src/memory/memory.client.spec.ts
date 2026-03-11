import { describe, expect, it, vi } from 'vitest';
import { MemoryClient } from './memory.client';
import type { MemoxClient } from '../memox';

describe('MemoryClient', () => {
  it('maps includeGraphContext to Anyhunt retrieval snake_case payload', async () => {
    const requestJson = vi.fn().mockResolvedValue({
      groups: {
        files: { items: [], returned_count: 0, hasMore: false },
        facts: { items: [], returned_count: 0, hasMore: false },
      },
    });

    const client = new MemoryClient({
      requestJson,
    } as unknown as MemoxClient);

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

    expect(requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
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
      }),
    );
  });

  it('serializes metadata scope for graph entity detail requests', async () => {
    const requestJson = vi.fn().mockResolvedValue({
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

    const client = new MemoryClient({
      requestJson,
    } as unknown as MemoxClient);

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

    expect(requestJson).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining(
          '/api/v1/graph/entities/entity-1?user_id=user-1&project_id=vault-1&metadata%5Btopic%5D=alpha&metadata%5Bnested%5D%5Blevel%5D=deep',
        ),
      }),
    );
  });
});
