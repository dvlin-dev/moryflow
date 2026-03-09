import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoxTenantTeardownService } from '../memox-tenant-teardown.service';
import type { VectorPrismaService } from '../../vector-prisma';
import type { StorageClient } from '../../storage';

const TRANSACTION_SENTINELS = {
  graphObservation: Symbol('graphObservation'),
  graphRelation: Symbol('graphRelation'),
  graphEntity: Symbol('graphEntity'),
  sourceChunk: Symbol('sourceChunk'),
  knowledgeSourceRevision: Symbol('knowledgeSourceRevision'),
  knowledgeSource: Symbol('knowledgeSource'),
  memoryFactHistory: Symbol('memoryFactHistory'),
  memoryFactFeedback: Symbol('memoryFactFeedback'),
  memoryFactExport: Symbol('memoryFactExport'),
  scopeRegistry: Symbol('scopeRegistry'),
  memoryFact: Symbol('memoryFact'),
} as const;

describe('MemoxTenantTeardownService', () => {
  let vectorPrisma: {
    knowledgeSourceRevision: {
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    memoryFactExport: {
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    graphObservation: { deleteMany: ReturnType<typeof vi.fn> };
    graphRelation: { deleteMany: ReturnType<typeof vi.fn> };
    graphEntity: { deleteMany: ReturnType<typeof vi.fn> };
    sourceChunk: { deleteMany: ReturnType<typeof vi.fn> };
    knowledgeSource: { deleteMany: ReturnType<typeof vi.fn> };
    memoryFactHistory: { deleteMany: ReturnType<typeof vi.fn> };
    memoryFactFeedback: { deleteMany: ReturnType<typeof vi.fn> };
    scopeRegistry: { deleteMany: ReturnType<typeof vi.fn> };
    memoryFact: { deleteMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let storageClient: {
    deleteFiles: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vectorPrisma = {
      knowledgeSourceRevision: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi
          .fn()
          .mockReturnValue(TRANSACTION_SENTINELS.knowledgeSourceRevision),
      },
      memoryFactExport: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi
          .fn()
          .mockReturnValue(TRANSACTION_SENTINELS.memoryFactExport),
      },
      graphObservation: {
        deleteMany: vi
          .fn()
          .mockReturnValue(TRANSACTION_SENTINELS.graphObservation),
      },
      graphRelation: {
        deleteMany: vi
          .fn()
          .mockReturnValue(TRANSACTION_SENTINELS.graphRelation),
      },
      graphEntity: {
        deleteMany: vi.fn().mockReturnValue(TRANSACTION_SENTINELS.graphEntity),
      },
      sourceChunk: {
        deleteMany: vi.fn().mockReturnValue(TRANSACTION_SENTINELS.sourceChunk),
      },
      knowledgeSource: {
        deleteMany: vi
          .fn()
          .mockReturnValue(TRANSACTION_SENTINELS.knowledgeSource),
      },
      memoryFactHistory: {
        deleteMany: vi
          .fn()
          .mockReturnValue(TRANSACTION_SENTINELS.memoryFactHistory),
      },
      memoryFactFeedback: {
        deleteMany: vi
          .fn()
          .mockReturnValue(TRANSACTION_SENTINELS.memoryFactFeedback),
      },
      scopeRegistry: {
        deleteMany: vi
          .fn()
          .mockReturnValue(TRANSACTION_SENTINELS.scopeRegistry),
      },
      memoryFact: {
        deleteMany: vi.fn().mockReturnValue(TRANSACTION_SENTINELS.memoryFact),
      },
      $transaction: vi.fn().mockResolvedValue(undefined),
    };
    storageClient = {
      deleteFiles: vi.fn().mockResolvedValue(true),
    };
  });

  const createService = () =>
    new MemoxTenantTeardownService(
      vectorPrisma as unknown as VectorPrismaService,
      storageClient as unknown as StorageClient,
    );

  it('deletes source objects and export objects before dropping Memox tenant rows', async () => {
    vectorPrisma.knowledgeSourceRevision.findMany.mockResolvedValue([
      {
        normalizedTextR2Key: 'src-tenant/vault-a/revision-1',
        blobR2Key: 'src-tenant/vault-b/revision-1',
      },
      {
        normalizedTextR2Key: 'src-tenant/vault-a/revision-2',
        blobR2Key: null,
      },
    ]);
    vectorPrisma.memoryFactExport.findMany.mockResolvedValue([
      { r2Key: 'export-1' },
      { r2Key: 'export-2' },
    ]);
    const service = createService();

    await service.deleteApiKeyTenant('api-key-1');

    expect(storageClient.deleteFiles).toHaveBeenCalledWith(
      'src-tenant',
      'vault-a',
      ['revision-1', 'revision-2'],
    );
    expect(storageClient.deleteFiles).toHaveBeenCalledWith(
      'src-tenant',
      'vault-b',
      ['revision-1'],
    );
    expect(storageClient.deleteFiles).toHaveBeenCalledWith(
      'api-key-1',
      'memox-exports',
      ['export-1', 'export-2'],
    );
    expect(vectorPrisma.$transaction).toHaveBeenCalledWith([
      TRANSACTION_SENTINELS.graphObservation,
      TRANSACTION_SENTINELS.graphRelation,
      TRANSACTION_SENTINELS.graphEntity,
      TRANSACTION_SENTINELS.sourceChunk,
      TRANSACTION_SENTINELS.knowledgeSourceRevision,
      TRANSACTION_SENTINELS.knowledgeSource,
      TRANSACTION_SENTINELS.memoryFactHistory,
      TRANSACTION_SENTINELS.memoryFactFeedback,
      TRANSACTION_SENTINELS.memoryFactExport,
      TRANSACTION_SENTINELS.scopeRegistry,
      TRANSACTION_SENTINELS.memoryFact,
    ]);
  });

  it('fails fast when object deletion does not complete', async () => {
    vectorPrisma.knowledgeSourceRevision.findMany.mockResolvedValue([
      {
        normalizedTextR2Key: 'src-tenant/vault-a/revision-1',
        blobR2Key: null,
      },
    ]);
    storageClient.deleteFiles.mockResolvedValue(false);
    const service = createService();

    await expect(service.deleteApiKeyTenant('api-key-1')).rejects.toThrow(
      'Failed to delete Memox tenant objects for src-tenant/vault-a',
    );
    expect(vectorPrisma.$transaction).not.toHaveBeenCalled();
  });
});
