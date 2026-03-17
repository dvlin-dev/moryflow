import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DesktopApi } from '@shared/ipc';
import { useGlobalSearch } from './use-global-search';

vi.mock('@/lib/server/auth-store', () => ({
  authStore: { getState: () => ({ user: { id: 'test-user' } }) },
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createFileHit = (docId: string) => ({
  type: 'file' as const,
  docId,
  vaultPath: '/vault',
  filePath: `/vault/${docId}.md`,
  relativePath: `${docId}.md`,
  fileName: `${docId}.md`,
  score: 1,
  snippet: '',
  updatedAt: 1,
});

describe('useGlobalSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('按 180ms 防抖发起查询', async () => {
    const queryMock = vi.fn().mockResolvedValue({ files: [], threads: [], tookMs: 1 });
    const memorySearchMock = vi.fn().mockResolvedValue({
      scope: {
        vaultId: 'vault-1',
        projectId: 'vault-1',
      },
      query: 'he',
      groups: {
        files: {
          items: [],
          returnedCount: 0,
          hasMore: false,
        },
        facts: {
          items: [],
          returnedCount: 0,
          hasMore: false,
        },
      },
    });
    window.desktopAPI = {
      search: {
        query: queryMock,
        rebuild: vi.fn(),
        getStatus: vi.fn(),
      },
      memory: {
        ...window.desktopAPI?.memory,
        search: memorySearchMock,
      },
    } as unknown as DesktopApi;

    const { result } = renderHook(() => useGlobalSearch(true));

    act(() => {
      result.current.setQuery('he');
    });

    act(() => {
      vi.advanceTimersByTime(179);
    });
    expect(queryMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    await act(async () => {
      await flushPromises();
    });

    expect(queryMock).toHaveBeenCalledWith({
      query: 'he',
      limitPerGroup: 10,
    });
    expect(memorySearchMock).toHaveBeenCalledWith({
      query: 'he',
      limitPerGroup: 10,
      includeGraphContext: false,
    });
  });

  it('丢弃过期请求结果，仅保留最新查询响应', async () => {
    const first = createDeferred<{
      files: ReturnType<typeof createFileHit>[];
      threads: [];
      tookMs: number;
    }>();
    const second = createDeferred<{
      files: ReturnType<typeof createFileHit>[];
      threads: [];
      tookMs: number;
    }>();

    const queryMock = vi.fn().mockImplementation(({ query }: { query: string }) => {
      if (query === 'first') {
        return first.promise;
      }
      return second.promise;
    });

    const memorySearchMock = vi.fn().mockResolvedValue({
      scope: {
        vaultId: 'vault-1',
        projectId: 'vault-1',
      },
      query: 'first',
      groups: {
        files: {
          items: [],
          returnedCount: 0,
          hasMore: false,
        },
        facts: {
          items: [],
          returnedCount: 0,
          hasMore: false,
        },
      },
    });

    window.desktopAPI = {
      search: {
        query: queryMock,
        rebuild: vi.fn(),
        getStatus: vi.fn(),
      },
      memory: {
        ...window.desktopAPI?.memory,
        search: memorySearchMock,
      },
    } as unknown as DesktopApi;

    const { result } = renderHook(() => useGlobalSearch(true));

    act(() => {
      result.current.setQuery('first');
    });
    act(() => {
      vi.advanceTimersByTime(180);
    });
    await act(async () => {
      await flushPromises();
    });

    act(() => {
      result.current.setQuery('second');
    });
    act(() => {
      vi.advanceTimersByTime(180);
    });
    await act(async () => {
      await flushPromises();
    });

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock).toHaveBeenNthCalledWith(1, { query: 'first', limitPerGroup: 10 });
    expect(queryMock).toHaveBeenNthCalledWith(2, { query: 'second', limitPerGroup: 10 });
    expect(memorySearchMock).toHaveBeenNthCalledWith(1, {
      query: 'first',
      limitPerGroup: 10,
      includeGraphContext: false,
    });
    expect(memorySearchMock).toHaveBeenNthCalledWith(2, {
      query: 'second',
      limitPerGroup: 10,
      includeGraphContext: false,
    });

    await act(async () => {
      second.resolve({ files: [createFileHit('second')], threads: [], tookMs: 1 });
      await flushPromises();
    });

    expect(result.current.files[0]?.docId).toBe('second');

    await act(async () => {
      first.resolve({ files: [createFileHit('first')], threads: [], tookMs: 1 });
      await flushPromises();
    });

    expect(result.current.files[0]?.docId).toBe('second');
  });

  it('在本地成功但 memory 失败时保留本地结果并标记 memory 不可用', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      files: [createFileHit('local-only')],
      threads: [],
      tookMs: 1,
    });
    const memorySearchMock = vi.fn().mockRejectedValue(new Error('Memory search unavailable'));

    window.desktopAPI = {
      search: {
        query: queryMock,
        rebuild: vi.fn(),
        getStatus: vi.fn(),
      },
      memory: {
        ...window.desktopAPI?.memory,
        search: memorySearchMock,
      },
    } as unknown as DesktopApi;

    const { result } = renderHook(() => useGlobalSearch(true));

    act(() => {
      result.current.setQuery('alpha');
    });
    act(() => {
      vi.advanceTimersByTime(180);
    });
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.memoryFiles).toHaveLength(0);
    expect(result.current.memoryFacts).toHaveLength(0);
    expect(result.current.error).toBeNull();
    expect(result.current.memoryUnavailable).toBe('Memory search unavailable');
  });

  it('在 memory API 缺失时仍保留本地搜索结果', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      files: [createFileHit('local-only')],
      threads: [],
      tookMs: 1,
    });

    window.desktopAPI = {
      search: {
        query: queryMock,
        rebuild: vi.fn(),
        getStatus: vi.fn(),
      },
    } as unknown as DesktopApi;

    const { result } = renderHook(() => useGlobalSearch(true));

    act(() => {
      result.current.setQuery('alpha');
    });
    act(() => {
      vi.advanceTimersByTime(180);
    });
    await act(async () => {
      await flushPromises();
    });

    expect(result.current.files).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(result.current.localUnavailable).toBeNull();
    expect(result.current.memoryUnavailable).toBe('Memory search unavailable');
  });
});
