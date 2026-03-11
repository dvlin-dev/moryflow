import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DesktopApi, VaultTreeNode } from '@shared/ipc';

import { useCreateFile } from './create-file';

const createFileNode = (overrides: Partial<VaultTreeNode> = {}): VaultTreeNode => ({
  id: 'folder-1',
  name: 'Projects',
  type: 'folder',
  path: '/vault/Projects',
  children: [],
  ...overrides,
});

describe('useCreateFile', () => {
  it('creates a root file with NewFile and opens it', async () => {
    const createFile = vi.fn().mockResolvedValue({ path: '/vault/NewFile.md' });
    const fetchTree = vi.fn().mockResolvedValue(undefined);
    const setPendingSelectionPath = vi.fn();
    const setPendingOpenPath = vi.fn();
    window.desktopAPI = {
      files: {
        createFile,
      },
    } as unknown as DesktopApi;

    const { result } = renderHook(() =>
      useCreateFile({
        t: (key: string) => key,
        ensureVaultSelected: () => true,
        vault: { path: '/vault' },
        selectedEntry: null,
        fetchTree,
        setPendingSelectionPath,
        setPendingOpenPath,
      })
    );

    await result.current({ forceRoot: true });

    expect(createFile).toHaveBeenCalledWith({
      parentPath: '/vault',
      name: 'NewFile',
    });
    expect(setPendingSelectionPath).toHaveBeenCalledWith('/vault/NewFile.md');
    expect(setPendingOpenPath).toHaveBeenCalledWith('/vault/NewFile.md');
    expect(fetchTree).toHaveBeenCalledWith('/vault');
  });

  it('creates a child file inside the provided target folder with NewFile', async () => {
    const createFile = vi.fn().mockResolvedValue({ path: '/vault/Projects/NewFile.md' });
    const fetchTree = vi.fn().mockResolvedValue(undefined);
    const setPendingSelectionPath = vi.fn();
    const setPendingOpenPath = vi.fn();
    const targetNode = createFileNode();

    window.desktopAPI = {
      files: {
        createFile,
      },
    } as unknown as DesktopApi;

    const { result } = renderHook(() =>
      useCreateFile({
        t: (key: string) => key,
        ensureVaultSelected: () => true,
        vault: { path: '/vault' },
        selectedEntry: null,
        fetchTree,
        setPendingSelectionPath,
        setPendingOpenPath,
      })
    );

    await result.current({ targetNode });

    expect(createFile).toHaveBeenCalledWith({
      parentPath: '/vault/Projects',
      name: 'NewFile',
    });
    expect(setPendingSelectionPath).toHaveBeenCalledWith('/vault/Projects/NewFile.md');
    expect(setPendingOpenPath).toHaveBeenCalledWith('/vault/Projects/NewFile.md');
  });

  it('creates without an input dialog dependency', async () => {
    const createFile = vi.fn().mockResolvedValue({ path: '/vault/NewFile.md' });

    window.desktopAPI = {
      files: {
        createFile,
      },
    } as unknown as DesktopApi;

    const { result } = renderHook(() =>
      useCreateFile({
        t: (key: string) => key,
        ensureVaultSelected: () => true,
        vault: { path: '/vault' },
        selectedEntry: null,
        fetchTree: vi.fn().mockResolvedValue(undefined),
        setPendingSelectionPath: vi.fn(),
        setPendingOpenPath: vi.fn(),
      })
    );

    await result.current({ forceRoot: true });

    expect(createFile).toHaveBeenCalledWith({
      parentPath: '/vault',
      name: 'NewFile',
    });
  });
});
