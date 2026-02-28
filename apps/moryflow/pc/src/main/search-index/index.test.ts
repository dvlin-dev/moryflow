/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getStoredVaultMock = vi.hoisted(() => vi.fn());
vi.mock('../vault.js', () => ({
  getStoredVault: getStoredVaultMock,
}));

const fileRebuildMock = vi.hoisted(() => vi.fn());
const fileOnAddOrChangeMock = vi.hoisted(() => vi.fn());
const fileOnDeleteMock = vi.hoisted(() => vi.fn());
vi.mock('./file-indexer.js', () => ({
  createFileIndexer: () => ({
    rebuild: fileRebuildMock,
    onFileAddedOrChanged: fileOnAddOrChangeMock,
    onFileDeleted: fileOnDeleteMock,
  }),
}));

const threadRebuildMock = vi.hoisted(() => vi.fn());
const threadOnUpsertMock = vi.hoisted(() => vi.fn());
const threadOnDeleteMock = vi.hoisted(() => vi.fn());
vi.mock('./thread-indexer.js', () => ({
  createThreadIndexer: () => ({
    rebuild: threadRebuildMock,
    onSessionUpsert: threadOnUpsertMock,
    onSessionDelete: threadOnDeleteMock,
  }),
}));

const runSearchQueryMock = vi.hoisted(() => vi.fn());
vi.mock('./query.js', () => ({
  runSearchQuery: runSearchQueryMock,
}));

const searchStatusState = vi.hoisted(() => ({
  state: 'idle' as 'idle' | 'building' | 'ready' | 'error',
  filesIndexed: 0,
  threadsIndexed: 0,
  lastBuiltAt: null as number | null,
  lastError: undefined as string | undefined,
}));
const markSearchIndexBuildingMock = vi.hoisted(() => vi.fn());
const markSearchIndexReadyMock = vi.hoisted(() => vi.fn());
const markSearchIndexErrorMock = vi.hoisted(() => vi.fn());
const countSearchDocumentsByKindMock = vi.hoisted(() => vi.fn(() => 0));

vi.mock('./store.js', () => ({
  getSearchIndexStatus: () => ({ ...searchStatusState }),
  markSearchIndexBuilding: (...args: unknown[]) => markSearchIndexBuildingMock(...args),
  markSearchIndexReady: (...args: unknown[]) => markSearchIndexReadyMock(...args),
  markSearchIndexError: (...args: unknown[]) => markSearchIndexErrorMock(...args),
  countSearchDocumentsByKind: (...args: unknown[]) => countSearchDocumentsByKindMock(...args),
}));

import { searchIndexService } from './index.js';

describe('searchIndexService', () => {
  beforeEach(() => {
    getStoredVaultMock.mockReset();
    fileRebuildMock.mockReset();
    fileOnAddOrChangeMock.mockReset();
    fileOnDeleteMock.mockReset();
    threadRebuildMock.mockReset();
    threadOnUpsertMock.mockReset();
    threadOnDeleteMock.mockReset();
    runSearchQueryMock.mockReset();
    markSearchIndexBuildingMock.mockReset();
    markSearchIndexReadyMock.mockReset();
    markSearchIndexErrorMock.mockReset();
    countSearchDocumentsByKindMock.mockReset();
    countSearchDocumentsByKindMock.mockReturnValue(0);

    searchStatusState.state = 'idle';
    searchStatusState.filesIndexed = 0;
    searchStatusState.threadsIndexed = 0;
    searchStatusState.lastBuiltAt = null;
    searchStatusState.lastError = undefined;

    markSearchIndexBuildingMock.mockImplementation(() => {
      searchStatusState.state = 'building';
    });

    markSearchIndexReadyMock.mockImplementation(
      ({ filesIndexed, threadsIndexed }: { filesIndexed: number; threadsIndexed: number }) => {
        searchStatusState.state = 'ready';
        searchStatusState.filesIndexed = filesIndexed;
        searchStatusState.threadsIndexed = threadsIndexed;
        searchStatusState.lastBuiltAt = Date.now();
        searchStatusState.lastError = undefined;
      }
    );

    markSearchIndexErrorMock.mockImplementation((error: unknown) => {
      searchStatusState.state = 'error';
      searchStatusState.lastError = error instanceof Error ? error.message : String(error);
    });

    getStoredVaultMock.mockResolvedValue({ path: '/vault' });
    fileRebuildMock.mockResolvedValue(3);
    threadRebuildMock.mockResolvedValue(2);
    runSearchQueryMock.mockResolvedValue({ files: [], threads: [], tookMs: 0 });
  });

  it('query 在 idle 时触发 rebuild，并把 limitPerGroup 限制到 10', async () => {
    await searchIndexService.query({ query: 'hello world', limitPerGroup: 99 });

    expect(fileRebuildMock).toHaveBeenCalledTimes(1);
    expect(threadRebuildMock).toHaveBeenCalledTimes(1);
    expect(runSearchQueryMock).toHaveBeenCalledWith({
      query: 'hello world',
      limitPerGroup: 10,
      vaultPath: '/vault',
    });
  });

  it('并发 rebuild 只执行一轮索引任务', async () => {
    let resolveRebuild: (() => void) | null = null;
    const rebuildPromise = new Promise<number>((resolve) => {
      resolveRebuild = () => resolve(3);
    });
    fileRebuildMock.mockReturnValue(rebuildPromise);
    threadRebuildMock.mockResolvedValue(2);

    const first = searchIndexService.rebuild();
    const second = searchIndexService.rebuild();

    resolveRebuild?.();
    await Promise.all([first, second]);

    expect(fileRebuildMock).toHaveBeenCalledTimes(1);
    expect(threadRebuildMock).toHaveBeenCalledTimes(1);
  });

  it('active vault 变化后 query 会触发重建', async () => {
    getStoredVaultMock.mockResolvedValue({ path: '/vault-a' });
    await searchIndexService.query({ query: 'hello world', limitPerGroup: 10 });

    getStoredVaultMock.mockResolvedValue({ path: '/vault-b' });
    await searchIndexService.query({ query: 'hello world', limitPerGroup: 10 });

    expect(fileRebuildMock).toHaveBeenCalledTimes(2);
    expect(threadRebuildMock).toHaveBeenCalledTimes(2);
    expect(runSearchQueryMock).toHaveBeenLastCalledWith({
      query: 'hello world',
      limitPerGroup: 10,
      vaultPath: '/vault-b',
    });
  });

  it('error 状态下 query 会自动触发重建恢复', async () => {
    searchStatusState.state = 'error';

    await searchIndexService.query({ query: 'recover me', limitPerGroup: 10 });

    expect(fileRebuildMock).toHaveBeenCalledTimes(1);
    expect(threadRebuildMock).toHaveBeenCalledTimes(1);
  });

  it('无 workspace 的 rebuild 不会锁死后续重建', async () => {
    getStoredVaultMock.mockResolvedValueOnce(null);
    await searchIndexService.rebuild();

    getStoredVaultMock.mockResolvedValueOnce({ path: '/vault' });
    await searchIndexService.rebuild();

    expect(fileRebuildMock).toHaveBeenCalledTimes(1);
    expect(threadRebuildMock).toHaveBeenCalledTimes(1);
  });
});
