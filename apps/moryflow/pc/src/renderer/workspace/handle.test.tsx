import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useInputDialogMock = vi.hoisted(() => vi.fn());
const useWorkspaceVaultMock = vi.hoisted(() => vi.fn());
const useVaultTreeStateMock = vi.hoisted(() => vi.fn());
const useDocumentStateMock = vi.hoisted(() => vi.fn());
const useVaultFileOperationsMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/input-dialog/handle', () => ({
  useInputDialog: () => useInputDialogMock(),
}));

vi.mock('./hooks/use-workspace-vault', () => ({
  useWorkspaceVault: () => useWorkspaceVaultMock(),
}));

vi.mock('./hooks/use-vault-tree', () => ({
  useVaultTreeState: () => useVaultTreeStateMock(),
}));

vi.mock('./hooks/use-document-state', () => ({
  useDocumentState: () => useDocumentStateMock(),
}));

vi.mock('./file-operations', () => ({
  useVaultFileOperations: (options: unknown) => useVaultFileOperationsMock(options),
}));

import { useDesktopWorkspace } from './handle';

describe('useDesktopWorkspace', () => {
  beforeEach(() => {
    useInputDialogMock.mockReturnValue({
      inputDialogState: { open: false, title: '', resolve: null },
      showInputDialog: vi.fn(),
      handleConfirm: vi.fn(),
      handleCancel: vi.fn(),
    });

    useWorkspaceVaultMock.mockReturnValue({
      vault: { path: '/vault' },
      isVaultHydrating: false,
      isPickingVault: false,
      vaultMessage: null,
      handleVaultOpen: vi.fn(),
      handleSelectDirectory: vi.fn(),
      handleVaultCreate: vi.fn(),
    });

    useVaultTreeStateMock.mockReturnValue({
      tree: [],
      treeState: 'idle',
      treeError: null,
      expandedPaths: [],
      selectedEntry: null,
      setSelectedEntry: vi.fn(),
      fetchTree: vi.fn(),
      refreshSubtree: vi.fn(),
      handleExpandedPathsChange: vi.fn(),
      handleSelectTreeNode: vi.fn(),
      handleRefreshTree: vi.fn(),
    });

    useDocumentStateMock.mockReturnValue({
      selectedFile: null,
      activeDoc: null,
      openTabs: [],
      documentSurface: 'empty',
      docState: 'idle',
      docError: null,
      saveState: 'idle',
      handleSelectFile: vi.fn(),
      handleSelectTab: vi.fn(),
      handleCloseTab: vi.fn(),
      handleEditorChange: vi.fn(),
      resetEditorState: vi.fn(),
      setPendingSelectionPath: vi.fn(),
      setPendingOpenPath: vi.fn(),
      pendingSelectionPath: null,
      pendingOpenPath: null,
      loadDocument: vi.fn(),
      setOpenTabs: vi.fn(),
      setActiveDoc: vi.fn(),
      setSelectedFile: vi.fn(),
    });

    useVaultFileOperationsMock.mockReturnValue({
      handleCreateFile: vi.fn(),
      handleCreateFolder: vi.fn(),
      handleRenameEntry: vi.fn(),
      handleDeleteEntry: vi.fn(),
      handleShowInFinder: vi.fn(),
      handleMoveByDrag: vi.fn(),
    });
  });

  it('exposes onTreeNodeCreateFolder from useDesktopWorkspace', () => {
    const handleCreateFolder = vi.fn();
    const node = { id: 'folder', name: 'docs', type: 'folder', path: '/vault/docs' } as const;

    useVaultFileOperationsMock.mockReturnValue({
      handleCreateFile: vi.fn(),
      handleCreateFolder,
      handleRenameEntry: vi.fn(),
      handleDeleteEntry: vi.fn(),
      handleShowInFinder: vi.fn(),
      handleMoveByDrag: vi.fn(),
    });

    const { result } = renderHook(() => useDesktopWorkspace());

    result.current.onTreeNodeCreateFolder(node);

    expect(handleCreateFolder).toHaveBeenCalledWith({ targetNode: node });
  });
});
