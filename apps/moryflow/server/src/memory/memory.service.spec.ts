import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockedFunction,
} from 'vitest';
import {
  ConflictException,
  Logger,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { MemoryService } from './memory.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';
import type { MemoryClient } from './memory.client';
import { MemoxGatewayError } from '../memox';

type MockMemoryClient = {
  getOverview: MockedFunction<MemoryClient['getOverview']>;
  searchRetrieval: MockedFunction<MemoryClient['searchRetrieval']>;
  listMemories: MockedFunction<MemoryClient['listMemories']>;
  getMemoryById: MockedFunction<MemoryClient['getMemoryById']>;
  createMemory: MockedFunction<MemoryClient['createMemory']>;
  updateMemory: MockedFunction<MemoryClient['updateMemory']>;
  deleteMemory: MockedFunction<MemoryClient['deleteMemory']>;
  batchUpdateMemories: MockedFunction<MemoryClient['batchUpdateMemories']>;
  batchDeleteMemories: MockedFunction<MemoryClient['batchDeleteMemories']>;
  getMemoryHistory: MockedFunction<MemoryClient['getMemoryHistory']>;
  feedbackMemory: MockedFunction<MemoryClient['feedbackMemory']>;
  queryGraph: MockedFunction<MemoryClient['queryGraph']>;
  getGraphEntityDetail: MockedFunction<MemoryClient['getGraphEntityDetail']>;
  createExport: MockedFunction<MemoryClient['createExport']>;
  getExport: MockedFunction<MemoryClient['getExport']>;
};

describe('MemoryService', () => {
  let service: MemoryService;
  let prismaMock: MockPrismaService;
  let memoryClientMock: MockMemoryClient;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    (
      prismaMock as unknown as {
        vault: { findUnique: ReturnType<typeof vi.fn> };
      }
    ).vault = {
      findUnique: vi.fn().mockResolvedValue({
        id: 'vault-1',
        userId: 'user-1',
        name: 'Workspace Vault',
      }),
    };

    memoryClientMock = {
      getOverview: vi.fn(),
      searchRetrieval: vi.fn(),
      listMemories: vi.fn(),
      getMemoryById: vi.fn(),
      createMemory: vi.fn(),
      updateMemory: vi.fn(),
      deleteMemory: vi.fn(),
      batchUpdateMemories: vi.fn(),
      batchDeleteMemories: vi.fn(),
      getMemoryHistory: vi.fn(),
      feedbackMemory: vi.fn(),
      queryGraph: vi.fn(),
      getGraphEntityDetail: vi.fn(),
      createExport: vi.fn(),
      getExport: vi.fn(),
    };

    service = new MemoryService(
      prismaMock as never,
      memoryClientMock as unknown as MemoryClient,
    );
  });

  it('returns overview for the owned vault with resolved Anyhunt scope', async () => {
    memoryClientMock.getOverview.mockResolvedValue({
      indexing: {
        source_count: 12,
        indexed_source_count: 10,
        pending_source_count: 1,
        failed_source_count: 1,
        last_indexed_at: '2026-03-11T10:00:00.000Z',
      },
      facts: {
        manual_count: 3,
        derived_count: 8,
      },
      graph: {
        entity_count: 5,
        relation_count: 4,
        projection_status: 'ready',
        last_projected_at: '2026-03-11T11:00:00.000Z',
      },
    });

    const result = await service.getOverview('user-1', {
      vaultId: 'vault-1',
    });

    expect(memoryClientMock.getOverview).toHaveBeenCalledWith({
      userId: 'user-1',
      projectId: 'vault-1',
    });
    expect(result).toEqual({
      scope: {
        vaultId: 'vault-1',
        projectId: 'vault-1',
      },
      indexing: {
        sourceCount: 12,
        indexedSourceCount: 10,
        pendingSourceCount: 1,
        failedSourceCount: 1,
        lastIndexedAt: '2026-03-11T10:00:00.000Z',
      },
      facts: {
        manualCount: 3,
        derivedCount: 8,
      },
      graph: {
        entityCount: 5,
        relationCount: 4,
        projectionStatus: 'ready',
        lastProjectedAt: '2026-03-11T11:00:00.000Z',
      },
    });
  });

  it('searches via retrieval and maps grouped file and fact results', async () => {
    memoryClientMock.searchRetrieval.mockResolvedValue({
      groups: {
        files: {
          items: [
            {
              id: 'source-result-1',
              result_kind: 'source',
              score: 0.9,
              rank: 1,
              source_id: 'source-1',
              source_type: 'note_markdown',
              project_id: 'vault-1',
              external_id: 'file-1',
              display_path: 'Notes/Alpha.md',
              title: 'Alpha',
              snippet: 'alpha snippet',
              matched_chunks: [],
              metadata: null,
            },
          ],
          returned_count: 1,
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
              content: 'remember alpha',
              metadata: { pinned: true },
            },
          ],
          returned_count: 1,
          hasMore: true,
        },
      },
    });
    memoryClientMock.getMemoryById.mockResolvedValue({
      id: 'fact-1',
      content: 'remember alpha',
      metadata: { pinned: true },
      categories: ['project'],
      immutable: false,
      origin_kind: 'MANUAL',
      source_id: null,
      source_revision_id: null,
      derived_key: null,
      expiration_date: null,
      user_id: 'user-1',
      project_id: 'vault-1',
      created_at: '2026-03-11T12:00:00.000Z',
      updated_at: '2026-03-11T12:30:00.000Z',
    });

    const result = await service.search('user-1', {
      vaultId: 'vault-1',
      query: 'alpha',
      limitPerGroup: 5,
      includeGraphContext: false,
    });

    expect(memoryClientMock.searchRetrieval).toHaveBeenCalledWith({
      query: 'alpha',
      includeGraphContext: false,
      scope: {
        user_id: 'user-1',
        project_id: 'vault-1',
      },
      group_limits: {
        sources: 5,
        memory_facts: 5,
      },
    });
    expect(result.groups.files.items).toEqual([
      {
        id: 'source-result-1',
        fileId: 'file-1',
        vaultId: 'vault-1',
        sourceId: 'source-1',
        title: 'Alpha',
        path: 'Notes/Alpha.md',
        snippet: 'alpha snippet',
        score: 0.9,
      },
    ]);
    expect(result.groups.facts.items).toEqual([
      {
        id: 'fact-1',
        text: 'remember alpha',
        kind: 'manual',
        readOnly: false,
        metadata: { pinned: true },
        score: 0.8,
        sourceId: null,
      },
    ]);
    expect(result.groups.facts.hasMore).toBe(true);
  });

  it('keeps search available when one fact detail becomes stale after retrieval', async () => {
    memoryClientMock.searchRetrieval.mockResolvedValue({
      groups: {
        files: {
          items: [],
          returned_count: 0,
          hasMore: false,
        },
        facts: {
          items: [
            {
              id: 'fact-result-stale',
              result_kind: 'memory_fact',
              score: 0.95,
              rank: 1,
              memory_fact_id: 'fact-stale',
              content: 'stale fact',
              metadata: null,
            },
            {
              id: 'fact-result-live',
              result_kind: 'memory_fact',
              score: 0.8,
              rank: 2,
              memory_fact_id: 'fact-live',
              content: 'live fact',
              metadata: { source: 'manual' },
            },
          ],
          returned_count: 2,
          hasMore: false,
        },
      },
    });
    memoryClientMock.getMemoryById
      .mockRejectedValueOnce(
        new MemoxGatewayError('missing', HttpStatus.NOT_FOUND, 'NOT_FOUND'),
      )
      .mockResolvedValueOnce({
        id: 'fact-live',
        content: 'live fact',
        metadata: { source: 'manual' },
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
      });

    const result = await service.search('user-1', {
      vaultId: 'vault-1',
      query: 'alpha',
      limitPerGroup: 5,
      includeGraphContext: false,
    });

    expect(result.groups.facts.items).toEqual([
      {
        id: 'fact-live',
        text: 'live fact',
        kind: 'manual',
        readOnly: false,
        metadata: { source: 'manual' },
        score: 0.8,
        sourceId: null,
      },
    ]);
    expect(result.groups.facts.returnedCount).toBe(1);
    expect(result.groups.facts.hasMore).toBe(false);
  });

  it('keeps search available when fact detail hydration hits a request error', async () => {
    const warnSpy = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    memoryClientMock.searchRetrieval.mockResolvedValue({
      groups: {
        files: {
          items: [],
          returned_count: 0,
          hasMore: false,
        },
        facts: {
          items: [
            {
              id: 'fact-result-bad-request',
              result_kind: 'memory_fact',
              score: 0.95,
              rank: 1,
              memory_fact_id: 'fact-bad-request',
              content: 'broken fact',
              metadata: null,
            },
          ],
          returned_count: 1,
          hasMore: false,
        },
      },
    });
    memoryClientMock.getMemoryById.mockRejectedValue(
      new MemoxGatewayError(
        'invalid scope',
        HttpStatus.BAD_REQUEST,
        'INVALID_SCOPE',
      ),
    );

    const result = await service.search('user-1', {
      vaultId: 'vault-1',
      query: 'alpha',
      limitPerGroup: 5,
      includeGraphContext: false,
    });

    expect(result.groups.files.items).toEqual([]);
    expect(result.groups.facts.items).toEqual([]);
    expect(result.groups.facts.returnedCount).toBe(0);
    expect(result.groups.facts.hasMore).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      'Skipped memory search hydration for fact fact-bad-request: upstream status 400 (INVALID_SCOPE)',
    );
  });

  it('keeps search available when fact detail hydration hits a non-gateway error', async () => {
    const warnSpy = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    memoryClientMock.searchRetrieval.mockResolvedValue({
      groups: {
        files: {
          items: [],
          returned_count: 0,
          hasMore: false,
        },
        facts: {
          items: [
            {
              id: 'fact-result-network',
              result_kind: 'memory_fact',
              score: 0.7,
              rank: 1,
              memory_fact_id: 'fact-network',
              content: 'network fact',
              metadata: null,
            },
          ],
          returned_count: 1,
          hasMore: false,
        },
      },
    });
    memoryClientMock.getMemoryById.mockRejectedValue(
      new Error('network timeout'),
    );

    const result = await service.search('user-1', {
      vaultId: 'vault-1',
      query: 'alpha',
      limitPerGroup: 5,
      includeGraphContext: false,
    });

    expect(result.groups.files.items).toEqual([]);
    expect(result.groups.facts.items).toEqual([]);
    expect(result.groups.facts.returnedCount).toBe(0);
    expect(result.groups.facts.hasMore).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      'Skipped memory search hydration for fact fact-network: unexpected detail error',
    );
  });

  it('filters facts by kind across upstream pages', async () => {
    memoryClientMock.listMemories
      .mockResolvedValueOnce(
        Array.from({ length: 100 }, (_, index) => ({
          id: `fact-derived-${index + 1}`,
          content: 'derived only',
          metadata: null,
          categories: [],
          immutable: true,
          origin_kind: 'SOURCE_DERIVED' as const,
          source_id: 'source-1',
          source_revision_id: 'rev-1',
          derived_key: `derived-${index + 1}`,
          expiration_date: null,
          user_id: 'user-1',
          project_id: 'vault-1',
          created_at: '2026-03-11T10:00:00.000Z',
          updated_at: '2026-03-11T10:00:00.000Z',
        })),
      )
      .mockResolvedValueOnce([
        {
          id: 'fact-manual-1',
          content: 'manual target',
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
          created_at: '2026-03-11T11:00:00.000Z',
          updated_at: '2026-03-11T11:00:00.000Z',
        },
      ]);

    const result = await service.listFacts('user-1', {
      vaultId: 'vault-1',
      kind: 'manual',
      page: 1,
      pageSize: 1,
    });

    expect(memoryClientMock.listMemories).toHaveBeenCalledTimes(2);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'fact-manual-1',
        kind: 'manual',
      }),
    ]);
    expect(result.hasMore).toBe(false);
  });

  it('caps upstream fact scanning and marks hasMore when sparse manual facts exceed the scan budget', async () => {
    const warnSpy = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    memoryClientMock.listMemories.mockImplementation((params) => {
      const page = typeof params.page === 'number' ? params.page : 0;
      if (page > 50) {
        return Promise.resolve([]);
      }
      return Promise.resolve(
        Array.from({ length: 100 }, (_, index) => ({
          id: `fact-derived-page-${page}-${index + 1}`,
          content: 'derived only',
          metadata: null,
          categories: [],
          immutable: true,
          origin_kind: 'SOURCE_DERIVED' as const,
          source_id: 'source-1',
          source_revision_id: 'rev-1',
          derived_key: `derived-page-${page}-${index + 1}`,
          expiration_date: null,
          user_id: 'user-1',
          project_id: 'vault-1',
          created_at: '2026-03-11T10:00:00.000Z',
          updated_at: '2026-03-11T10:00:00.000Z',
        })),
      );
    });

    const result = await service.listFacts('user-1', {
      vaultId: 'vault-1',
      kind: 'manual',
      page: 1,
      pageSize: 5,
    });

    expect(memoryClientMock.listMemories).toHaveBeenCalledTimes(50);
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Memory fact listing hit upstream scan cap'),
    );
    warnSpy.mockRestore();
  });

  it('creates a manual fact without exposing upstream messages or infer protocol', async () => {
    memoryClientMock.createMemory.mockResolvedValue([
      {
        id: 'fact-1',
        data: {
          content: 'remember this fact',
        },
        event: 'ADD',
      },
    ]);
    memoryClientMock.getMemoryById.mockResolvedValue({
      id: 'fact-1',
      content: 'remember this fact',
      metadata: { source: 'manual' },
      categories: ['project'],
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
    });

    const result = await service.createFact('user-1', {
      vaultId: 'vault-1',
      text: 'remember this fact',
      metadata: { source: 'manual' },
      categories: ['project'],
    });

    const createMemoryCall = memoryClientMock.createMemory.mock.calls[0]?.[0];
    expect(createMemoryCall).toMatchObject({
      messages: [{ role: 'user', content: 'remember this fact' }],
      infer: false,
      async_mode: false,
      user_id: 'user-1',
      project_id: 'vault-1',
      metadata: { source: 'manual' },
      custom_categories: {
        project: true,
      },
    });
    expect(createMemoryCall?.idempotency_key).toEqual(expect.any(String));
    expect(memoryClientMock.getMemoryById).toHaveBeenCalledWith('fact-1');
    expect(result).toEqual(
      expect.objectContaining({
        id: 'fact-1',
        text: 'remember this fact',
        kind: 'manual',
        readOnly: false,
      }),
    );
  });

  it('rejects updating a derived fact at the gateway boundary', async () => {
    memoryClientMock.getMemoryById.mockResolvedValue({
      id: 'fact-2',
      content: 'derived fact',
      metadata: null,
      categories: [],
      immutable: true,
      origin_kind: 'SOURCE_DERIVED',
      source_id: 'source-1',
      source_revision_id: 'rev-1',
      derived_key: 'derived-key',
      expiration_date: null,
      user_id: 'user-1',
      project_id: 'vault-1',
      created_at: '2026-03-11T12:00:00.000Z',
      updated_at: '2026-03-11T12:00:00.000Z',
    });

    await expect(
      service.updateFact('user-1', 'fact-2', {
        vaultId: 'vault-1',
        text: 'should fail',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(memoryClientMock.updateMemory).not.toHaveBeenCalled();
  });

  it('returns fact history, graph query, feedback and exports through the unified gateway', async () => {
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
      project_id: 'vault-1',
      created_at: '2026-03-11T10:00:00.000Z',
      updated_at: '2026-03-11T10:00:00.000Z',
    });
    memoryClientMock.getMemoryHistory.mockResolvedValue([
      {
        id: 'history-1',
        memory_id: 'fact-1',
        event: 'ADD',
        old_content: null,
        new_content: 'remember alpha',
        metadata: null,
        input: null,
        created_at: '2026-03-11T10:00:00.000Z',
        user_id: 'user-1',
      },
    ]);
    memoryClientMock.feedbackMemory.mockResolvedValue({
      id: 'feedback-1',
      feedback: 'POSITIVE',
      feedback_reason: 'relevant',
    });
    memoryClientMock.queryGraph.mockResolvedValue({
      entities: [
        {
          id: 'entity-1',
          entity_type: 'person',
          canonical_name: 'Alice',
          aliases: ['A'],
          metadata: null,
          last_seen_at: '2026-03-11T11:00:00.000Z',
        },
      ],
      relations: [],
      evidence_summary: {
        observation_count: 1,
        source_count: 0,
        memory_fact_count: 1,
        latest_observed_at: '2026-03-11T11:00:00.000Z',
      },
    });
    memoryClientMock.createExport.mockResolvedValue({
      memory_export_id: 'export-1',
    });
    memoryClientMock.getExport.mockResolvedValue({
      results: [
        {
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
          project_id: 'vault-1',
          created_at: '2026-03-11T10:00:00.000Z',
          updated_at: '2026-03-11T10:00:00.000Z',
        },
      ],
    });

    const history = await service.getFactHistory('user-1', 'fact-1', {
      vaultId: 'vault-1',
    });
    const feedback = await service.feedbackFact('user-1', {
      vaultId: 'vault-1',
      factId: 'fact-1',
      feedback: 'positive',
      reason: 'relevant',
    });
    const graph = await service.queryGraph('user-1', {
      vaultId: 'vault-1',
      query: 'alice',
      limit: 10,
    });
    const exportJob = await service.createExport('user-1', {
      vaultId: 'vault-1',
    });
    const exportData = await service.getExport('user-1', {
      vaultId: 'vault-1',
      exportId: 'export-1',
    });

    expect(history.items[0]).toEqual(
      expect.objectContaining({
        id: 'history-1',
        factId: 'fact-1',
        event: 'ADD',
      }),
    );
    expect(feedback).toEqual({
      id: 'feedback-1',
      feedback: 'positive',
      reason: 'relevant',
    });
    expect(graph.entities[0]).toEqual(
      expect.objectContaining({
        id: 'entity-1',
        entityType: 'person',
        canonicalName: 'Alice',
      }),
    );
    expect(exportJob).toEqual({ exportId: 'export-1' });
    expect(exportData.items).toEqual([
      expect.objectContaining({
        id: 'fact-1',
        kind: 'manual',
      }),
    ]);
    const createExportCall = memoryClientMock.createExport.mock.calls[0]?.[0];
    expect(createExportCall).toMatchObject({
      project_id: 'vault-1',
      filters: {
        user_id: 'user-1',
      },
    });
    expect(createExportCall?.idempotency_key).toEqual(expect.any(String));
  });

  it('keeps null feedback as null instead of coercing it to positive', async () => {
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
      project_id: 'vault-1',
      created_at: '2026-03-11T10:00:00.000Z',
      updated_at: '2026-03-11T10:00:00.000Z',
    });
    memoryClientMock.feedbackMemory.mockResolvedValue({
      id: 'feedback-1',
      feedback: null,
      feedback_reason: null,
    });

    const result = await service.feedbackFact('user-1', {
      vaultId: 'vault-1',
      factId: 'fact-1',
      feedback: 'positive',
    });

    expect(result).toEqual({
      id: 'feedback-1',
      feedback: null,
      reason: null,
    });
  });

  it('forwards metadata scope to graph entity detail', async () => {
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

    await service.getEntityDetail('user-1', 'entity-1', {
      vaultId: 'vault-1',
      metadata: {
        topic: 'alpha',
      },
    });

    expect(memoryClientMock.getGraphEntityDetail).toHaveBeenCalledWith(
      'entity-1',
      {
        user_id: 'user-1',
        project_id: 'vault-1',
        metadata: {
          topic: 'alpha',
        },
      },
    );
  });

  it('rejects access to a vault outside the current user scope', async () => {
    (
      prismaMock as unknown as {
        vault: { findUnique: ReturnType<typeof vi.fn> };
      }
    ).vault.findUnique.mockResolvedValue({
      id: 'vault-1',
      userId: 'user-2',
      name: 'Other Vault',
    });

    await expect(
      service.getOverview('user-1', {
        vaultId: 'vault-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(memoryClientMock.getOverview).not.toHaveBeenCalled();
  });
});
