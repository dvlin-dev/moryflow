import { describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from '../testing/mocks/prisma.mock';
import { VectorizeProjectionReconcileService } from './vectorize-projection-reconcile.service';

describe('VectorizeProjectionReconcileService', () => {
  it('deletes stale projection records grouped by user', async () => {
    const prisma = createPrismaMock();
    prisma.vectorizedFile.findMany.mockResolvedValue([
      { userId: 'user-1', fileId: 'file-live' },
      { userId: 'user-1', fileId: 'file-stale-1' },
      { userId: 'user-2', fileId: 'file-stale-2' },
    ]);
    prisma.syncFile.findMany.mockResolvedValue([{ id: 'file-live' }]);

    const deleteManyMock = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    const updateManyMock = vi.fn().mockResolvedValue({ count: 1 });
    const txMock = {
      vectorizedFile: {
        deleteMany: deleteManyMock,
      },
      userStorageUsage: {
        updateMany: updateManyMock,
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof txMock) => Promise<number>) => callback(txMock),
    );

    const vectorizeClient = {
      delete: vi.fn().mockResolvedValue({ success: true }),
    };

    const service = new VectorizeProjectionReconcileService(
      prisma as never,
      vectorizeClient as never,
    );

    const result = await service.reconcileOnce(100);

    expect(result).toEqual({
      scanned: 3,
      stale: 2,
      deleted: 2,
      failed: 0,
    });
    expect(vectorizeClient.delete).toHaveBeenNthCalledWith(1, 'user-1', [
      'file-stale-1',
    ]);
    expect(vectorizeClient.delete).toHaveBeenNthCalledWith(2, 'user-2', [
      'file-stale-2',
    ]);
    expect(deleteManyMock).toHaveBeenNthCalledWith(1, {
      where: { userId: 'user-1', fileId: { in: ['file-stale-1'] } },
    });
    expect(deleteManyMock).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-2', fileId: { in: ['file-stale-2'] } },
    });
    expect(updateManyMock).toHaveBeenNthCalledWith(1, {
      where: { userId: 'user-1' },
      data: { vectorizedCount: { decrement: 1 } },
    });
    expect(updateManyMock).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-2' },
      data: { vectorizedCount: { decrement: 1 } },
    });
  });

  it('continues deleting stale database records when worker delete fails', async () => {
    const prisma = createPrismaMock();
    prisma.vectorizedFile.findMany.mockResolvedValue([
      { userId: 'user-1', fileId: 'file-stale-1' },
    ]);
    prisma.syncFile.findMany.mockResolvedValue([]);

    const deleteManyMock = vi.fn().mockResolvedValue({ count: 1 });
    const updateManyMock = vi.fn().mockResolvedValue({ count: 1 });
    const txMock = {
      vectorizedFile: {
        deleteMany: deleteManyMock,
      },
      userStorageUsage: {
        updateMany: updateManyMock,
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof txMock) => Promise<number>) => callback(txMock),
    );

    const vectorizeClient = {
      delete: vi.fn().mockRejectedValue(new Error('worker unavailable')),
    };

    const service = new VectorizeProjectionReconcileService(
      prisma as never,
      vectorizeClient as never,
    );

    const result = await service.reconcileOnce(50);

    expect(result).toEqual({
      scanned: 1,
      stale: 1,
      deleted: 1,
      failed: 0,
    });
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { userId: 'user-1', fileId: { in: ['file-stale-1'] } },
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { vectorizedCount: { decrement: 1 } },
    });
  });
});
