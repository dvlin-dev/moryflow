import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useTranslationMock = vi.hoisted(() => vi.fn());
const useVaultGuardMock = vi.hoisted(() => vi.fn());
const useCreateFileMock = vi.hoisted(() => vi.fn());
const useCreateFolderMock = vi.hoisted(() => vi.fn());
const useRenameEntryMock = vi.hoisted(() => vi.fn());
const useDeleteEntryMock = vi.hoisted(() => vi.fn());
const useShowInFinderMock = vi.hoisted(() => vi.fn());
const useMoveByDragMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => useTranslationMock(),
}));

vi.mock('./guard', () => ({
  useVaultGuard: (...args: unknown[]) => useVaultGuardMock(...args),
}));

vi.mock('./operations/create-file', () => ({
  useCreateFile: (...args: unknown[]) => useCreateFileMock(...args),
}));

vi.mock('./operations/create-folder', () => ({
  useCreateFolder: (...args: unknown[]) => useCreateFolderMock(...args),
}));

vi.mock('./operations/rename-entry', () => ({
  useRenameEntry: (...args: unknown[]) => useRenameEntryMock(...args),
}));

vi.mock('./operations/delete-entry', () => ({
  useDeleteEntry: (...args: unknown[]) => useDeleteEntryMock(...args),
}));

vi.mock('./operations/show-in-finder', () => ({
  useShowInFinder: (...args: unknown[]) => useShowInFinderMock(...args),
}));

vi.mock('./operations/move-by-drag', () => ({
  useMoveByDrag: (...args: unknown[]) => useMoveByDragMock(...args),
}));

import { useVaultFileOperations } from './index';

describe('useVaultFileOperations', () => {
  beforeEach(() => {
    useTranslationMock.mockReturnValue({ t: (key: string) => key });
    useVaultGuardMock.mockReturnValue(vi.fn());
    useCreateFileMock.mockReturnValue(vi.fn());
    useCreateFolderMock.mockReturnValue(vi.fn());
    useRenameEntryMock.mockReturnValue(vi.fn());
    useDeleteEntryMock.mockReturnValue(vi.fn());
    useShowInFinderMock.mockReturnValue(vi.fn());
    useMoveByDragMock.mockReturnValue(vi.fn());
  });

  it('passes showInputDialog only to rename flow, not quick-create hooks', () => {
    const showInputDialog = vi.fn();

    renderHook(() =>
      useVaultFileOperations({
        vault: { path: '/vault' },
        selectedEntry: null,
        activeDoc: null,
        fetchTree: vi.fn(),
        refreshSubtree: vi.fn(),
        resetEditorState: vi.fn(),
        loadDocument: vi.fn(),
        setPendingSelectionPath: vi.fn(),
        setPendingOpenPath: vi.fn(),
        setOpenTabs: vi.fn(),
        setSelectedEntry: vi.fn(),
        showInputDialog,
      })
    );

    expect(useCreateFileMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        showInputDialog: expect.any(Function),
      })
    );
    expect(useCreateFolderMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        showInputDialog: expect.any(Function),
      })
    );
    expect(useRenameEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        showInputDialog,
      })
    );
  });
});
