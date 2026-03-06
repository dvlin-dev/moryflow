/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFileMock = vi.hoisted(() => vi.fn());
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    readFile: readFileMock,
  };
});

const querySearchDocumentsMock = vi.hoisted(() => vi.fn());
vi.mock('./store.js', () => ({
  querySearchDocuments: querySearchDocumentsMock,
}));

const readSessionsMock = vi.hoisted(() => vi.fn(() => ({})));
vi.mock('../chat-session-store/store.js', () => ({
  readSessions: readSessionsMock,
}));

const extractSessionBodyForSearchMock = vi.hoisted(() => vi.fn(() => 'thread body'));
vi.mock('./thread-indexer.js', () => ({
  extractSessionBodyForSearch: extractSessionBodyForSearchMock,
}));

import { runSearchQuery } from './query.js';

const createFileRow = (index: number) => ({
  id: index + 1,
  docId: `file-${index}`,
  kind: 'file' as const,
  vaultPath: '/vault',
  entityKey: `/vault/${index}.md`,
  title: `${index}.md`,
  updatedAt: 1,
  digest: `digest-${index}`,
  filePath: `/vault/${index}.md`,
  relativePath: `${index}.md`,
  fileName: `${index}.md`,
  sessionId: null,
  rank: 1,
});

describe('search-index query', () => {
  beforeEach(() => {
    readFileMock.mockReset();
    querySearchDocumentsMock.mockReset();
    readSessionsMock.mockReset();
    extractSessionBodyForSearchMock.mockReset();

    readFileMock.mockResolvedValue('hello query snippet text');
    readSessionsMock.mockReturnValue({});
    extractSessionBodyForSearchMock.mockReturnValue('thread body');
  });

  it('回源读取受 QUERY_SOURCE_BUDGET 限制（最多 20）', async () => {
    querySearchDocumentsMock.mockImplementation(
      ({ kind }: { kind: 'file' | 'thread'; mode: 'exact' | 'fuzzy' }) => {
        if (kind === 'file') {
          return Array.from({ length: 25 }, (_, index) => createFileRow(index));
        }
        return [];
      }
    );

    const result = await runSearchQuery({ query: 'query', vaultPath: '/vault', limitPerGroup: 25 });

    expect(result.files).toHaveLength(25);
    expect(readFileMock).toHaveBeenCalledTimes(20);
  });

  it('exact 无命中时，fuzzy 命中仍可返回结果', async () => {
    querySearchDocumentsMock.mockImplementation(
      ({ kind, mode }: { kind: 'file' | 'thread'; mode: 'exact' | 'fuzzy' }) => {
        if (kind === 'file' && mode === 'fuzzy') {
          return [createFileRow(1)];
        }
        return [];
      }
    );

    const result = await runSearchQuery({ query: '你好', vaultPath: '/vault', limitPerGroup: 10 });

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.docId).toBe('file-1');
  });

  it('同 doc 在 exact 与 fuzzy 同时命中时优先使用 exact 分值', async () => {
    querySearchDocumentsMock.mockImplementation(
      ({ kind, mode }: { kind: 'file' | 'thread'; mode: 'exact' | 'fuzzy' }) => {
        if (kind !== 'file') {
          return [];
        }

        if (mode === 'exact') {
          return [{ ...createFileRow(2), rank: 0.2 }];
        }

        return [{ ...createFileRow(2), rank: 0.2 }];
      }
    );

    const result = await runSearchQuery({ query: 'hello', vaultPath: '/vault', limitPerGroup: 10 });

    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.score).toBeGreaterThan(0.8);
  });

  it('相同 docId+digest 命中 snippetCache，不重复回源', async () => {
    querySearchDocumentsMock.mockImplementation(
      ({ kind }: { kind: 'file' | 'thread'; mode: 'exact' | 'fuzzy' }) => {
        if (kind === 'file') {
          return [createFileRow(1000)];
        }
        return [];
      }
    );

    await runSearchQuery({ query: 'query', vaultPath: '/vault', limitPerGroup: 10 });
    await runSearchQuery({ query: 'query', vaultPath: '/vault', limitPerGroup: 10 });

    expect(readFileMock).toHaveBeenCalledTimes(1);
  });
});
