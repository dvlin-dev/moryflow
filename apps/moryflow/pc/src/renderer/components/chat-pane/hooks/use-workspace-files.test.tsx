import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DesktopApi, VaultTreeNode } from '@shared/ipc';
import { useWorkspaceFiles } from './use-workspace-files';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve: resolve! };
};

const createFileNode = (path: string): VaultTreeNode => ({
  id: path,
  name: path.split('/').pop() ?? path,
  type: 'file',
  path,
});

describe('useWorkspaceFiles', () => {
  beforeEach(() => {
    window.desktopAPI = {
      vault: {
        readTree: vi.fn(),
      },
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('ignores stale responses when vault path switches', async () => {
    const first = createDeferred<VaultTreeNode[]>();
    const second = createDeferred<VaultTreeNode[]>();

    window.desktopAPI.vault.readTree = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const { result, rerender } = renderHook(({ vaultPath }) => useWorkspaceFiles(vaultPath), {
      initialProps: { vaultPath: '/vault-a' },
    });

    rerender({ vaultPath: '/vault-b' });

    await act(async () => {
      second.resolve([createFileNode('/vault-b/b.md')]);
    });

    await waitFor(() =>
      expect(result.current.files.map((file) => file.path)).toEqual(['/vault-b/b.md'])
    );

    await act(async () => {
      first.resolve([createFileNode('/vault-a/a.md')]);
    });

    expect(result.current.files.map((file) => file.path)).toEqual(['/vault-b/b.md']);
  });
});
