/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fastGlobMock = vi.hoisted(() => vi.fn());
vi.mock('fast-glob', () => ({
  default: fastGlobMock,
}));

const readFileMock = vi.hoisted(() => vi.fn());
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    readFile: readFileMock,
  };
});

const upsertSearchDocumentMock = vi.hoisted(() => vi.fn());
const deleteSearchDocumentByIdMock = vi.hoisted(() => vi.fn());
const deleteSearchDocumentsByIdsMock = vi.hoisted(() => vi.fn());
const listSearchDocumentsByKindMock = vi.hoisted(() => vi.fn());

vi.mock('./store.js', () => ({
  upsertSearchDocument: upsertSearchDocumentMock,
  deleteSearchDocumentById: deleteSearchDocumentByIdMock,
  deleteSearchDocumentsByIds: deleteSearchDocumentsByIdsMock,
  listSearchDocumentsByKind: listSearchDocumentsByKindMock,
}));

import { createFileIndexer } from './file-indexer.js';

describe('search-index file-indexer', () => {
  beforeEach(() => {
    fastGlobMock.mockReset();
    readFileMock.mockReset();
    upsertSearchDocumentMock.mockReset();
    deleteSearchDocumentByIdMock.mockReset();
    deleteSearchDocumentsByIdsMock.mockReset();
    listSearchDocumentsByKindMock.mockReset();
  });

  it('rebuild 只索引 markdown 文件并写入索引', async () => {
    fastGlobMock.mockResolvedValue(['/vault/a.md', '/vault/sub/b.md']);
    readFileMock.mockImplementation(async (targetPath: string) => {
      if (targetPath.endsWith('a.md')) {
        return '# hello';
      }
      return '# world';
    });
    listSearchDocumentsByKindMock.mockReturnValue([]);

    const indexer = createFileIndexer();
    const count = await indexer.rebuild('/vault');

    expect(count).toBe(2);
    expect(upsertSearchDocumentMock).toHaveBeenCalledTimes(2);
    expect(deleteSearchDocumentsByIdsMock).toHaveBeenCalledWith([]);
  });

  it('删除 markdown 文件时清理索引', async () => {
    const indexer = createFileIndexer();

    await indexer.onFileDeleted('/vault', '/vault/a.md');

    expect(deleteSearchDocumentByIdMock).toHaveBeenCalledTimes(1);
  });

  it('非 markdown 文件不进入索引', async () => {
    const indexer = createFileIndexer();

    await indexer.onFileAddedOrChanged('/vault', '/vault/a.txt');
    await indexer.onFileDeleted('/vault', '/vault/a.txt');

    expect(upsertSearchDocumentMock).not.toHaveBeenCalled();
    expect(deleteSearchDocumentByIdMock).not.toHaveBeenCalled();
  });
});
