import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVaultTreeState } from './use-vault-tree';
import type { DesktopApi, VaultTreeNode } from '@shared/ipc';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useVaultTreeState', () => {
  const vault = { path: '/vault' };
  const rootNode: VaultTreeNode = {
    id: 'root',
    name: 'vault',
    type: 'folder',
    path: '/vault',
    children: [
      {
        id: 'valid',
        name: 'valid',
        type: 'folder',
        path: '/vault/valid',
        children: [],
      },
    ],
  };
  const childNode: VaultTreeNode = {
    id: 'child',
    name: 'child.md',
    type: 'file',
    path: '/vault/valid/child.md',
  };

  let readTreeChildren: ReturnType<typeof vi.fn>;
  let setExpandedPaths: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    readTreeChildren = vi.fn((path: string) => {
      if (path === '/vault/valid') {
        return Promise.resolve([childNode]);
      }
      return Promise.reject(new Error('missing'));
    });

    setExpandedPaths = vi.fn();

    window.desktopAPI = {
      vault: {
        readTreeRoot: vi.fn().mockResolvedValue([rootNode]),
        readTreeChildren,
        getTreeCache: vi.fn().mockResolvedValue(null),
        setTreeCache: vi.fn(),
        updateWatchPaths: vi.fn(),
      },
      workspace: {
        getExpandedPaths: vi.fn().mockResolvedValue([]),
        setExpandedPaths,
      },
      events: {},
    } as unknown as DesktopApi;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('prunes invalid expanded paths after refresh', async () => {
    const { result } = renderHook(() => useVaultTreeState(vault));

    await waitFor(() => expect(window.desktopAPI.workspace.getExpandedPaths).toHaveBeenCalled());
    await waitFor(() => expect(window.desktopAPI.vault.readTreeRoot).toHaveBeenCalled());

    act(() => {
      result.current.handleExpandedPathsChange(['/vault/valid', '/vault/missing']);
    });

    await act(async () => {
      await result.current.fetchTree(vault.path);
    });

    await waitFor(() => expect(result.current.expandedPaths).toEqual(['/vault/valid']));
    expect(setExpandedPaths).toHaveBeenLastCalledWith('/vault', ['/vault/valid']);
    expect(readTreeChildren).toHaveBeenCalledWith('/vault/missing');
  });
});
