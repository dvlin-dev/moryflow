import { describe, expect, it, vi, type MockedFunction } from 'vitest';
import { MemoryController } from './memory.controller';
import type { MemoryService } from './memory.service';
import type { CurrentUserDto } from '../types';

type MemoryControllerServiceMock = {
  getOverview: MockedFunction<MemoryService['getOverview']>;
  search: MockedFunction<MemoryService['search']>;
  listFacts: MockedFunction<MemoryService['listFacts']>;
  getFactDetail: MockedFunction<MemoryService['getFactDetail']>;
  createFact: MockedFunction<MemoryService['createFact']>;
  updateFact: MockedFunction<MemoryService['updateFact']>;
  deleteFact: MockedFunction<MemoryService['deleteFact']>;
  batchUpdateFacts: MockedFunction<MemoryService['batchUpdateFacts']>;
  batchDeleteFacts: MockedFunction<MemoryService['batchDeleteFacts']>;
  getFactHistory: MockedFunction<MemoryService['getFactHistory']>;
  feedbackFact: MockedFunction<MemoryService['feedbackFact']>;
  queryGraph: MockedFunction<MemoryService['queryGraph']>;
  getEntityDetail: MockedFunction<MemoryService['getEntityDetail']>;
  createExport: MockedFunction<MemoryService['createExport']>;
  getExport: MockedFunction<MemoryService['getExport']>;
};

describe('MemoryController', () => {
  const createServiceMock = (): MemoryControllerServiceMock => ({
    getOverview: vi.fn(),
    search: vi.fn(),
    listFacts: vi.fn(),
    getFactDetail: vi.fn(),
    createFact: vi.fn(),
    updateFact: vi.fn(),
    deleteFact: vi.fn(),
    batchUpdateFacts: vi.fn(),
    batchDeleteFacts: vi.fn(),
    getFactHistory: vi.fn(),
    feedbackFact: vi.fn(),
    queryGraph: vi.fn(),
    getEntityDetail: vi.fn(),
    createExport: vi.fn(),
    getExport: vi.fn(),
  });

  const user: CurrentUserDto = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Demo',
    subscriptionTier: 'pro',
    isAdmin: false,
  };

  it('delegates overview to the service with the current user id', async () => {
    const service = createServiceMock();
    service.getOverview.mockResolvedValue({
      scope: {
        vaultId: 'vault-1',
        projectId: 'vault-1',
      },
      indexing: {
        sourceCount: 1,
        indexedSourceCount: 1,
        pendingSourceCount: 0,
        failedSourceCount: 0,
        lastIndexedAt: null,
      },
      facts: {
        manualCount: 1,
        derivedCount: 0,
      },
      graph: {
        entityCount: 0,
        relationCount: 0,
        projectionStatus: 'idle',
        lastProjectedAt: null,
      },
    });
    const controller = new MemoryController(
      service as unknown as MemoryService,
    );

    const result = await controller.getOverview(user, { vaultId: 'vault-1' });

    expect(service.getOverview).toHaveBeenCalledWith('user-1', {
      vaultId: 'vault-1',
    });
    expect(result.scope.vaultId).toBe('vault-1');
  });

  it('delegates fact creation and entity detail lookup to the service', async () => {
    const service = createServiceMock();
    service.createFact.mockResolvedValue({
      id: 'fact-1',
      text: 'remember alpha',
      kind: 'manual',
      readOnly: false,
      metadata: null,
      categories: [],
      sourceId: null,
      sourceRevisionId: null,
      derivedKey: null,
      expirationDate: null,
      createdAt: '2026-03-11T10:00:00.000Z',
      updatedAt: '2026-03-11T10:00:00.000Z',
    });
    service.getEntityDetail.mockResolvedValue({
      entity: {
        id: 'entity-1',
        entityType: 'person',
        canonicalName: 'Alice',
        aliases: [],
        metadata: null,
        lastSeenAt: null,
        incomingRelations: [],
        outgoingRelations: [],
      },
      evidenceSummary: {
        observationCount: 0,
        sourceCount: 0,
        memoryFactCount: 0,
        latestObservedAt: null,
      },
      recentObservations: [],
    });
    const controller = new MemoryController(
      service as unknown as MemoryService,
    );

    const fact = await controller.createFact(user, {
      vaultId: 'vault-1',
      text: 'remember alpha',
    });
    const entity = await controller.getEntityDetail(user, 'entity-1', {
      vaultId: 'vault-1',
      metadata: {
        topic: 'alpha',
      },
    });

    expect(service.createFact).toHaveBeenCalledWith('user-1', {
      vaultId: 'vault-1',
      text: 'remember alpha',
    });
    expect(service.getEntityDetail).toHaveBeenCalledWith('user-1', 'entity-1', {
      vaultId: 'vault-1',
      metadata: {
        topic: 'alpha',
      },
    });
    expect(fact.id).toBe('fact-1');
    expect(entity.entity.id).toBe('entity-1');
  });

  it('accepts fact list filters from request body instead of query string', async () => {
    const service = createServiceMock();
    service.listFacts.mockResolvedValue({
      scope: {
        vaultId: 'vault-1',
        projectId: 'vault-1',
      },
      page: 1,
      pageSize: 20,
      hasMore: false,
      items: [],
    });
    const controller = new MemoryController(
      service as unknown as MemoryService,
    );

    await controller.listFacts(user, {
      vaultId: 'vault-1',
      kind: 'manual',
      page: 1,
      pageSize: 20,
      categories: ['project', 'alpha'],
    });

    expect(service.listFacts).toHaveBeenCalledWith('user-1', {
      vaultId: 'vault-1',
      kind: 'manual',
      page: 1,
      pageSize: 20,
      categories: ['project', 'alpha'],
    });
  });

  it('delegates fact deletion and returns no content payload', async () => {
    const service = createServiceMock();
    service.deleteFact.mockResolvedValue(undefined);
    const controller = new MemoryController(
      service as unknown as MemoryService,
    );

    const result = await controller.deleteFact(user, 'fact-1', {
      vaultId: 'vault-1',
    });

    expect(service.deleteFact).toHaveBeenCalledWith('user-1', 'fact-1', {
      vaultId: 'vault-1',
    });
    expect(result).toBeUndefined();
  });
});
