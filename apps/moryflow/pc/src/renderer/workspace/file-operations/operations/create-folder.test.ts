import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DesktopApi, VaultTreeNode } from '@shared/ipc';

import { useCreateFolder } from './create-folder';

const createFolderNode = (overrides: Partial<VaultTreeNode> = {}): VaultTreeNode => ({
  id: 'folder-1',
  name: 'Projects',
  type: 'folder',
  path: '/vault/Projects',
  children: [],
  ...overrides,
});

describe('useCreateFolder', () => {
  it('creates a root folder with NewFolder', async () => {
    const createFolder = vi.fn().mockResolvedValue({ path: '/vault/NewFolder' });
    const fetchTree = vi.fn().mockResolvedValue(undefined);
    const setPendingSelectionPath = vi.fn();
    window.desktopAPI = {
      files: {
        createFolder,
      },
    } as unknown as DesktopApi;

    const { result } = renderHook(() =>
      useCreateFolder({
        t: (key: string) => key,
        ensureVaultSelected: () => true,
        vault: { path: '/vault' },
        selectedEntry: null,
        fetchTree,
        setPendingSelectionPath,
      })
    );

    await result.current({ forceRoot: true });

    expect(createFolder).toHaveBeenCalledWith({
      parentPath: '/vault',
      name: 'NewFolder',
    });
    expect(setPendingSelectionPath).toHaveBeenCalledWith('/vault/NewFolder');
    expect(fetchTree).toHaveBeenCalledWith('/vault');
  });

  it('creates a child folder inside the provided target folder with NewFolder', async () => {
    const createFolder = vi.fn().mockResolvedValue({ path: '/vault/Projects/NewFolder' });
    const fetchTree = vi.fn().mockResolvedValue(undefined);
    const setPendingSelectionPath = vi.fn();
    const targetNode = createFolderNode();

    window.desktopAPI = {
      files: {
        createFolder,
      },
    } as unknown as DesktopApi;

    const { result } = renderHook(() =>
      useCreateFolder({
        t: (key: string) => key,
        ensureVaultSelected: () => true,
        vault: { path: '/vault' },
        selectedEntry: null,
        fetchTree,
        setPendingSelectionPath,
      })
    );

    await result.current({ targetNode });

    expect(createFolder).toHaveBeenCalledWith({
      parentPath: '/vault/Projects',
      name: 'NewFolder',
    });
    expect(setPendingSelectionPath).toHaveBeenCalledWith('/vault/Projects/NewFolder');
  });

  it('creates without an input dialog dependency', async () => {
    const createFolder = vi.fn().mockResolvedValue({ path: '/vault/NewFolder' });

    window.desktopAPI = {
      files: {
        createFolder,
      },
    } as unknown as DesktopApi;

    const { result } = renderHook(() =>
      useCreateFolder({
        t: (key: string) => key,
        ensureVaultSelected: () => true,
        vault: { path: '/vault' },
        selectedEntry: null,
        fetchTree: vi.fn().mockResolvedValue(undefined),
        setPendingSelectionPath: vi.fn(),
      })
    );

    await result.current({ forceRoot: true });

    expect(createFolder).toHaveBeenCalledWith({
      parentPath: '/vault',
      name: 'NewFolder',
    });
  });
});
