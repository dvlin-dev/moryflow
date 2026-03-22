import { describe, expect, it } from 'vitest';
import {
  AnyhuntRetrievalSearchResponseSchema,
  MemoryKnowledgeStatusesQuerySchema,
  MemoryKnowledgeStatusesResponseSchema,
  MemoryGraphQuerySchema,
  MemoryOverviewResponseSchema,
} from './dto/memory.dto';

describe('Moryflow memory DTO', () => {
  it('requires workspaceId for graph queries and allows disabled/failed statuses', () => {
    expect(() =>
      MemoryGraphQuerySchema.parse({
        limit: 10,
      }),
    ).toThrow();

    expect(
      MemoryOverviewResponseSchema.parse({
        scope: {
          workspaceId: 'workspace-1',
          projectId: 'project-1',
          syncVaultId: null,
        },
        indexing: {
          sourceCount: 0,
          indexedSourceCount: 0,
          indexingSourceCount: 0,
          attentionSourceCount: 0,
          lastIndexedAt: null,
        },
        facts: {
          manualCount: 0,
          derivedCount: 0,
        },
        graph: {
          entityCount: 0,
          relationCount: 0,
          projectionStatus: 'disabled',
          lastProjectedAt: null,
        },
      }).graph.projectionStatus,
    ).toBe('disabled');

    expect(
      MemoryOverviewResponseSchema.parse({
        scope: {
          workspaceId: 'workspace-1',
          projectId: 'project-1',
          syncVaultId: null,
        },
        indexing: {
          sourceCount: 0,
          indexedSourceCount: 0,
          indexingSourceCount: 0,
          attentionSourceCount: 0,
          lastIndexedAt: null,
        },
        facts: {
          manualCount: 0,
          derivedCount: 0,
        },
        graph: {
          entityCount: 0,
          relationCount: 0,
          projectionStatus: 'failed',
          lastProjectedAt: null,
        },
      }).graph.projectionStatus,
    ).toBe('failed');
  });

  it('accepts workspace-scoped knowledge status queries and semantic status items', () => {
    expect(
      MemoryKnowledgeStatusesQuerySchema.parse({
        workspaceId: '00000000-0000-4000-8000-000000000001',
        filter: 'attention',
      }),
    ).toEqual({
      workspaceId: '00000000-0000-4000-8000-000000000001',
      filter: 'attention',
    });

    expect(
      MemoryKnowledgeStatusesResponseSchema.parse({
        scope: {
          workspaceId: 'workspace-1',
          projectId: 'project-1',
          syncVaultId: null,
        },
        items: [
          {
            documentId: 'document-1',
            title: 'Doc',
            path: 'notes/doc.md',
            state: 'NEEDS_ATTENTION',
            userFacingReason: 'This file has no searchable text.',
            lastAttemptAt: '2026-03-11T07:00:00.000Z',
          },
        ],
      }).items[0]?.state,
    ).toBe('NEEDS_ATTENTION');
  });

  it('accepts hydrated retrieval fact results without requiring follow-up memory reads', () => {
    const parsed = AnyhuntRetrievalSearchResponseSchema.parse({
      groups: {
        files: {
          items: [],
          returned_count: 0,
          hasMore: false,
        },
        facts: {
          items: [
            {
              id: 'fact-result-1',
              result_kind: 'memory_fact',
              score: 0.8,
              rank: 1,
              memory_fact_id: 'fact-1',
              content: 'Alpha fact',
              metadata: null,
              origin_kind: 'SOURCE_DERIVED',
              immutable: true,
              source_id: 'source-1',
              source_revision_id: 'revision-1',
              derived_key: 'fact:alpha',
            },
          ],
          returned_count: 1,
          hasMore: false,
        },
      },
    });

    expect(parsed.groups.facts.items[0]).toMatchObject({
      memory_fact_id: 'fact-1',
      origin_kind: 'SOURCE_DERIVED',
      immutable: true,
      source_id: 'source-1',
      source_revision_id: 'revision-1',
      derived_key: 'fact:alpha',
    });
  });
});
