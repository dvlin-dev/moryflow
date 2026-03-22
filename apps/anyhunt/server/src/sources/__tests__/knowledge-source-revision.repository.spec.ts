import { describe, expect, it, vi } from 'vitest';
import { KnowledgeSourceRevisionRepository } from '../knowledge-source-revision.repository';

function createVectorPrismaMock() {
  const tx = {
    knowledgeSourceRevision: {
      create: vi.fn(),
    },
    knowledgeSource: {
      update: vi.fn(),
    },
  };

  return {
    knowledgeSourceRevision: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    knowledgeSource: {
      update: vi.fn(),
    },
    $transaction: vi.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    ),
    __tx: tx,
  };
}

describe('KnowledgeSourceRevisionRepository', () => {
  it('creates the revision and advances latestRevisionId in the same transaction', async () => {
    const vectorPrisma = createVectorPrismaMock();
    const repository = new KnowledgeSourceRevisionRepository(
      vectorPrisma as never,
    );
    vectorPrisma.__tx.knowledgeSourceRevision.create.mockResolvedValue({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'READY_TO_FINALIZE',
    });
    vectorPrisma.__tx.knowledgeSource.update.mockResolvedValue({
      id: 'source-1',
    });

    const result = await repository.createRevisionAndRecordLatest('api-key-1', {
      id: 'revision-1',
      sourceId: 'source-1',
      ingestMode: 'INLINE_TEXT',
      userId: 'user-1',
      status: 'READY_TO_FINALIZE',
    });

    expect(vectorPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(
      vectorPrisma.__tx.knowledgeSourceRevision.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'revision-1',
        apiKeyId: 'api-key-1',
        sourceId: 'source-1',
      }),
    });
    expect(vectorPrisma.__tx.knowledgeSource.update).toHaveBeenCalledWith({
      where: { id: 'source-1' },
      data: { latestRevisionId: 'revision-1' },
    });
    expect(result).toEqual({
      id: 'revision-1',
      sourceId: 'source-1',
      status: 'READY_TO_FINALIZE',
    });
  });
});
