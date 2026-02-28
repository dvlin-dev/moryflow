import { useCallback, useEffect, useState } from 'react';
import type { VaultTreeNode } from '@shared/ipc';
import type { DesktopWorkspaceController, SelectedFile } from './const';
import { useInputDialog } from '@/components/input-dialog/handle';
import { useVaultFileOperations } from './file-operations';
import { useVaultTreeState } from './hooks/use-vault-tree';
import { useDocumentState } from './hooks/use-document-state';
import { useWorkspaceVault } from './hooks/use-workspace-vault';
import { findNodeByPath, ensureMarkdownExtension, sanitizeEntryName } from './utils';
import { useTranslation } from '@/lib/i18n';

export const useDesktopWorkspace = (): DesktopWorkspaceController => {
  const { t } = useTranslation('workspace');
  const [commandOpen, setCommandOpen] = useState(false);

  const { inputDialogState, showInputDialog, handleConfirm, handleCancel } = useInputDialog();
  const {
    vault,
    isPickingVault,
    vaultMessage,
    handleVaultOpen,
    handleSelectDirectory,
    handleVaultCreate,
  } = useWorkspaceVault();

  const {
    tree,
    treeState,
    treeError,
    expandedPaths,
    selectedEntry,
    setSelectedEntry,
    fetchTree,
    handleExpandedPathsChange,
    handleSelectTreeNode,
    handleRefreshTree,
  } = useVaultTreeState(vault);

  const {
    selectedFile,
    activeDoc,
    openTabs,
    docState,
    docError,
    saveState,
    handleSelectFile,
    handleSelectTab,
    handleCloseTab,
    handleEditorChange,
    resetEditorState,
    setPendingSelectionPath,
    setPendingOpenPath,
    pendingSelectionPath,
    pendingOpenPath,
    loadDocument,
    setOpenTabs,
    setActiveDoc,
    setSelectedFile,
  } = useDocumentState({ vault });

  useEffect(() => {
    if (!pendingSelectionPath) {
      return;
    }
    const found = findNodeByPath(tree, pendingSelectionPath);
    if (!found) {
      return;
    }
    setSelectedEntry(found);
    if (found.type === 'file') {
      handleSelectFile(found);
    }
    setPendingSelectionPath(null);
  }, [tree, pendingSelectionPath, setPendingSelectionPath, setSelectedEntry, handleSelectFile]);

  useEffect(() => {
    if (!pendingOpenPath) {
      return;
    }
    const found = findNodeByPath(tree, pendingOpenPath);
    if (!found || found.type !== 'file') {
      return;
    }
    void loadDocument({ id: found.id, name: found.name, path: found.path });
    setPendingOpenPath(null);
  }, [tree, pendingOpenPath, setPendingOpenPath, loadDocument]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const {
    handleCreateFile,
    handleCreateFolder,
    handleRenameEntry,
    handleDeleteEntry,
    handleShowInFinder,
    handleMoveByDrag,
  } = useVaultFileOperations({
    vault,
    selectedEntry,
    activeDoc,
    fetchTree,
    resetEditorState,
    loadDocument,
    setPendingSelectionPath,
    setPendingOpenPath,
    setOpenTabs,
    setSelectedEntry,
    showInputDialog,
  });

  const onCreateFileInRoot = useCallback(() => {
    void handleCreateFile({ forceRoot: true });
  }, [handleCreateFile]);

  const onCreateFolderInRoot = useCallback(() => {
    void handleCreateFolder({ forceRoot: true });
  }, [handleCreateFolder]);

  const onSelectTreeNode = useCallback(
    (node: VaultTreeNode) => {
      setSelectedEntry(node);
      handleSelectTreeNode(node);
    },
    [handleSelectTreeNode]
  );

  const onOpenFile = useCallback(
    (node: VaultTreeNode) => {
      handleSelectFile(node);
    },
    [handleSelectFile]
  );

  // 通过标题输入框重命名文件
  const handleRenameByTitle = useCallback(
    async (path: string, newName: string): Promise<{ path: string; name: string }> => {
      if (!vault) {
        throw new Error(t('pleaseSelectVault'));
      }

      const sanitized = sanitizeEntryName(newName);
      if (!sanitized) {
        throw new Error(t('invalidFileName'));
      }

      const nextName = ensureMarkdownExtension(sanitized);

      const result = await window.desktopAPI.files.rename({ path, nextName });

      // 更新打开的标签栏
      setOpenTabs((tabs) =>
        tabs.map((tab) => (tab.path === path ? { ...tab, name: nextName, path: result.path } : tab))
      );

      // 更新当前文档路径（关键：确保后续重命名使用新路径）
      setActiveDoc((prev) =>
        prev && prev.path === path ? { ...prev, name: nextName, path: result.path } : prev
      );

      // 更新选中文件路径
      setSelectedFile((prev) =>
        prev && prev.path === path ? { ...prev, name: nextName, path: result.path } : prev
      );

      // 刷新文件树
      await fetchTree(vault.path);

      return { path: result.path, name: nextName };
    },
    [vault, fetchTree, setOpenTabs, setActiveDoc, setSelectedFile]
  );

  return {
    vault,
    vaultMessage,
    isPickingVault,
    tree,
    expandedPaths,
    treeState,
    treeError,
    selectedEntry,
    selectedFile,
    openTabs,
    activeDoc,
    docState,
    docError,
    saveState,
    commandOpen,
    inputDialogState,
    onInputDialogConfirm: handleConfirm,
    onInputDialogCancel: handleCancel,
    onCommandOpenChange: setCommandOpen,
    onVaultOpen: handleVaultOpen,
    onSelectDirectory: handleSelectDirectory,
    onVaultCreate: handleVaultCreate,
    onRefreshTree: handleRefreshTree,
    onSelectTreeNode,
    onExpandedPathsChange: handleExpandedPathsChange,
    onOpenFile,
    onSelectTab: handleSelectTab,
    onCloseTab: handleCloseTab,
    onEditorChange: handleEditorChange,
    onRetryLoad: () => {
      if (selectedFile) {
        void loadDocument(selectedFile);
      }
    },
    onRenameByTitle: handleRenameByTitle,
    onTreeNodeRename: handleRenameEntry,
    onTreeNodeDelete: handleDeleteEntry,
    onTreeNodeCreateFile: (node) => void handleCreateFile({ targetNode: node }),
    onTreeNodeShowInFinder: (node) => handleShowInFinder(node.path),
    onTreeNodeMove: handleMoveByDrag,
    onCreateFileInRoot,
    onCreateFolderInRoot,
  };
};
