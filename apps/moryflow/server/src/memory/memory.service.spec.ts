import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MemoryService } from './memory.service';
import type { MemoryClient } from './memory.client';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

type MemoryClientMock = {
  getOverview: ReturnType<typeof vi.fn>;
  getKnowledgeStatuses: ReturnType<typeof vi.fn>;
  createMemory: ReturnType<typeof vi.fn>;
  getMemoryById: ReturnType<typeof vi.fn>;
  updateMemory: ReturnType<typeof vi.fn>;
  searchRetrieval: ReturnType<typeof vi.fn>;
  queryGraph: ReturnType<typeof vi.fn>;
  getGraphEntityDetail: ReturnType<typeof vi.fn>;
};

describe('MemoryService', () => {
  let prismaMock: MockPrismaService;
  let memoryClientMock: MemoryClientMock;
  let service: MemoryService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      userId: 'user-1',
      syncVault: {
        id: 'vault-1',
      },
    });
    prismaMock.workspaceContentOutbox.count.mockResolvedValue(0);

    memoryClientMock = {
      getOverview: vi.fn(),
      getKnowledgeStatuses: vi.fn(),
      createMemory: vi.fn(),
      getMemoryById: vi.fn(),
      updateMemory: vi.fn(),
      searchRetrieval: vi.fn(),
      queryGraph: vi.fn(),
      getGraphEntityDetail: vi.fn(),
    };

    service = new MemoryService(
      prismaMock as never,
      memoryClientMock as unknown as MemoryClient,
    );
  });

  it('resolves workspace scope and returns overview with sync transport metadata', async () => {
    memoryClientMock.getOverview.mockResolvedValue({
      indexing: {
        source_count: 2,
        indexed_source_count: 2,
        indexing_source_count: 0,
        attention_source_count: 0,
        last_indexed_at: null,
      },
      facts: {
        manual_count: 1,
        derived_count: 3,
      },
      graph: {
        entity_count: 4,
        relation_count: 5,
        projection_status: 'ready',
        last_projected_at: null,
      },
    });

    const result = await service.getOverview('user-1', {
      workspaceId: 'workspace-1',
    });

    expect(prismaMock.workspace.findUnique).toHaveBeenCalledWith({
      where: { id: 'workspace-1' },
      select: {
        id: true,
        userId: true,
        syncVault: {
          select: {
            id: true,
          },
        },
      },
    });
    expect(memoryClientMock.getOverview).toHaveBeenCalledWith({
      userId: 'user-1',
      projectId: 'workspace-1',
    });
    expect(result.scope).toEqual({
      workspaceId: 'workspace-1',
      projectId: 'workspace-1',
      syncVaultId: 'vault-1',
    });
    expect((result as { projection?: unknown }).projection).toEqual({
      pending: false,
      unresolvedEventCount: 0,
    });
  });

  it('reports workspace-scoped unresolved outbox events in the overview response', async () => {
    prismaMock.workspaceContentOutbox.count.mockResolvedValueOnce(2);
    memoryClientMock.getOverview.mockResolvedValue({
      indexing: {
        source_count: 0,
        indexed_source_count: 0,
        indexing_source_count: 0,
        attention_source_count: 0,
        last_indexed_at: null,
      },
      facts: {
        manual_count: 0,
        derived_count: 0,
      },
      graph: {
        entity_count: 0,
        relation_count: 0,
        projection_status: 'idle',
        last_projected_at: null,
      },
    });

    const result = await service.getOverview('user-1', {
      workspaceId: 'workspace-1',
    });

    expect(prismaMock.workspaceContentOutbox.count).toHaveBeenCalledWith({
      where: {
        workspaceId: 'workspace-1',
        processedAt: null,
      },
    });
    expect((result as { projection?: unknown }).projection).toEqual({
      pending: true,
      unresolvedEventCount: 2,
    });
  });

  it('creates manual facts under workspace project scope', async () => {
    memoryClientMock.createMemory.mockResolvedValue([{ id: 'fact-1' }]);
    memoryClientMock.getMemoryById.mockResolvedValue({
      id: 'fact-1',
      content: 'remember alpha',
      metadata: null,
      categories: [],
      immutable: false,
      origin_kind: 'MANUAL',
      source_id: null,
      source_revision_id: null,
      derived_key: null,
      expiration_date: null,
      user_id: 'user-1',
      project_id: 'workspace-1',
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z',
    });

    const result = await service.createFact('user-1', {
      workspaceId: 'workspace-1',
      text: 'remember alpha',
      categories: ['project'],
    });

    expect(memoryClientMock.createMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        project_id: 'workspace-1',
        messages: [{ role: 'user', content: 'remember alpha' }],
        custom_categories: {
          project: true,
        },
      }),
    );
    expect(result.id).toBe('fact-1');
    expect(result.kind).toBe('manual');
  });

  it('returns scoped knowledge status items without leaking transport field names', async () => {
    memoryClientMock.getKnowledgeStatuses.mockResolvedValue({
      items: [
        {
          document_id: 'document-1',
          title: 'Doc',
          path: 'notes/doc.md',
          state: 'NEEDS_ATTENTION',
          user_facing_reason: 'This file has no searchable text.',
          last_attempt_at: '2026-03-11T07:00:00.000Z',
        },
      ],
    });

    const result = await service.getKnowledgeStatuses('user-1', {
      workspaceId: 'workspace-1',
      filter: 'attention',
    });

    expect(memoryClientMock.getKnowledgeStatuses).toHaveBeenCalledWith({
      userId: 'user-1',
      projectId: 'workspace-1',
      filter: 'attention',
    });
    expect(result).toEqual({
      scope: {
        workspaceId: 'workspace-1',
        projectId: 'workspace-1',
        syncVaultId: 'vault-1',
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
    });
  });

  it('rejects updates to derived facts even when the workspace matches', async () => {
    memoryClientMock.getMemoryById.mockResolvedValue({
      id: 'fact-2',
      content: 'derived fact',
      metadata: null,
      categories: [],
      immutable: true,
      origin_kind: 'SOURCE_DERIVED',
      source_id: 'source-1',
      source_revision_id: 'revision-1',
      derived_key: null,
      expiration_date: null,
      user_id: 'user-1',
      project_id: 'workspace-1',
      created_at: '2026-03-14T00:00:00.000Z',
      updated_at: '2026-03-14T00:00:00.000Z',
    });

    await expect(
      service.updateFact('user-1', 'fact-2', {
        workspaceId: 'workspace-1',
        text: 'updated',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(memoryClientMock.updateMemory).not.toHaveBeenCalled();
  });

  it('routes graph query and entity detail through the workspace project scope only', async () => {
    memoryClientMock.queryGraph.mockResolvedValue({
      entities: [],
      relations: [],
      evidence_summary: {
        observation_count: 0,
        source_count: 0,
        memory_fact_count: 0,
        latest_observed_at: null,
      },
    });
    memoryClientMock.getGraphEntityDetail.mockResolvedValue({
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

    await service.queryGraph('user-1', {
      workspaceId: 'workspace-1',
      query: 'alice',
      limit: 10,
      entityTypes: ['person'],
    });
    await service.getEntityDetail('user-1', 'entity-1', {
      workspaceId: 'workspace-1',
    });

    expect(memoryClientMock.queryGraph).toHaveBeenCalledWith({
      query: 'alice',
      limit: 10,
      entity_types: ['person'],
      scope: {
        project_id: 'workspace-1',
      },
    });
    expect(memoryClientMock.getGraphEntityDetail).toHaveBeenCalledWith(
      'entity-1',
      {
        project_id: 'workspace-1',
      },
    );
  });

  it('bridges workspace-scoped retrieval and graph read results into moryflow contracts', async () => {
    memoryClientMock.searchRetrieval.mockResolvedValue({
      groups: {
        files: {
          items: [
            {
              id: 'source-result-1',
              score: 0.9,
              rank: 1,
              source_id: 'source-1',
              source_type: 'moryflow_workspace_markdown_v1',
              project_id: 'workspace-1',
              external_id: 'document-1',
              display_path: 'Docs/Alpha.md',
              title: 'Alpha',
              snippet: 'alpha snippet',
              matched_chunks: [{ chunk_id: 'chunk-1', chunk_index: 0 }],
              metadata: null,
            },
          ],
          returned_count: 1,
          hasMore: false,
        },
        facts: {
          items: [
            {
              result_kind: 'memory_fact',
              id: 'fact-result-1',
              score: 0.8,
              rank: 1,
              memory_fact_id: 'fact-1',
              content: 'Alpha fact',
              metadata: null,
              origin_kind: 'SOURCE_DERIVED',
              immutable: true,
              source_id: 'source-1',
              source_revision_id: 'revision-1',
              derived_key: null,
            },
          ],
          returned_count: 1,
          hasMore: false,
        },
      },
    });
    memoryClientMock.queryGraph.mockResolvedValue({
      entities: [
        {
          id: 'entity-1',
          entity_type: 'topic',
          canonical_name: 'Alpha',
          aliases: ['A'],
          metadata: null,
          last_seen_at: null,
        },
      ],
      relations: [],
      evidence_summary: {
        observation_count: 1,
        source_count: 1,
        memory_fact_count: 1,
        latest_observed_at: null,
      },
    });

    const searchResult = await service.search('user-1', {
      workspaceId: 'workspace-1',
      query: 'alpha',
      limitPerGroup: 5,
      includeGraphContext: false,
    });
    const graphResult = await service.queryGraph('user-1', {
      workspaceId: 'workspace-1',
      query: 'alpha',
      limit: 10,
    });

    expect(memoryClientMock.searchRetrieval).toHaveBeenCalledWith({
      query: 'alpha',
      includeGraphContext: false,
      scope: {
        user_id: 'user-1',
        project_id: 'workspace-1',
      },
      group_limits: {
        sources: 5,
        memory_facts: 5,
      },
    });
    expect(searchResult.scope).toEqual({
      workspaceId: 'workspace-1',
      projectId: 'workspace-1',
      syncVaultId: 'vault-1',
    });
    expect(searchResult.groups.files.items).toEqual([
      {
        id: 'source-result-1',
        documentId: 'document-1',
        workspaceId: 'workspace-1',
        sourceId: 'source-1',
        title: 'Alpha',
        path: 'Docs/Alpha.md',
        snippet: 'alpha snippet',
        score: 0.9,
      },
    ]);
    expect(searchResult.groups.facts.items).toEqual([
      {
        id: 'fact-1',
        text: 'Alpha fact',
        kind: 'source-derived',
        readOnly: true,
        metadata: null,
        score: 0.8,
        sourceId: 'source-1',
      },
    ]);
    expect(memoryClientMock.getMemoryById).not.toHaveBeenCalled();
    expect(graphResult.entities).toEqual([
      {
        id: 'entity-1',
        entityType: 'topic',
        canonicalName: 'Alpha',
        aliases: ['A'],
        metadata: null,
        lastSeenAt: null,
      },
    ]);
    expect(graphResult.evidenceSummary).toEqual({
      observationCount: 1,
      sourceCount: 1,
      memoryFactCount: 1,
      latestObservedAt: null,
    });
  });

  it('throws when the workspace does not belong to the current user', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(null);

    await expect(
      service.getOverview('user-1', {
        workspaceId: 'workspace-missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(memoryClientMock.getOverview).not.toHaveBeenCalled();
  });
});
