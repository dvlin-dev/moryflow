import { useCallback, useEffect, useMemo, useState } from 'react';
import type { VaultInfo, VaultTreeNode } from '@shared/ipc';
import type { CommandAction } from '@/components/command-palette/const';
import type { DesktopWorkspaceProps, SelectedFile } from './const';
import { useInputDialog } from '@/components/input-dialog/handle';
import { useVaultFileOperations } from './file-operations';
import { useVaultTreeState } from './hooks/use-vault-tree';
import { useDocumentState } from './hooks/use-document-state';
import { findNodeByPath, ensureMarkdownExtension, sanitizeEntryName } from './utils';
import { useTranslation } from '@/lib/i18n';

export const useDesktopWorkspace = (): DesktopWorkspaceProps => {
  const { t } = useTranslation('workspace');
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [isPickingVault, setIsPickingVault] = useState(false);
  const [vaultMessage, setVaultMessage] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { inputDialogState, showInputDialog, handleConfirm, handleCancel } = useInputDialog();

  const hydrateVault = useCallback(async () => {
    // 首次启动：自动创建默认 workspace（不阻塞 UI；失败则回退到原有选择流程）
    try {
      await window.desktopAPI.vault.ensureDefaultWorkspace();
    } catch (error) {
      console.warn('[workspace] ensureDefaultWorkspace failed', error);
    }

    const info = await window.desktopAPI.vault.getActiveVault();
    setVault(info ? { path: info.path } : null);
  }, []);

  useEffect(() => {
    void hydrateVault();
  }, [hydrateVault]);

  // 监听活动工作区变更，更新 vault 状态
  useEffect(() => {
    if (!window.desktopAPI?.vault?.onActiveVaultChange) return;

    const dispose = window.desktopAPI.vault.onActiveVaultChange((newVault) => {
      setVault(newVault ? { path: newVault.path } : null);
    });

    return dispose;
  }, []);

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

  const handleVaultOpen = useCallback(async () => {
    setIsPickingVault(true);
    setVaultMessage(null);
    try {
      const info = await window.desktopAPI.vault.open({ askUser: true });
      if (!info) {
        return;
      }
      setVault(info);
      await fetchTree(info.path);
      setSelectedEntry(null);
      setPendingSelectionPath(null);
      setPendingOpenPath(null);
    } finally {
      setIsPickingVault(false);
    }
  }, [fetchTree, setPendingSelectionPath, setPendingOpenPath, setSelectedEntry]);

  const handleSelectDirectory = useCallback(async () => {
    setIsPickingVault(true);
    try {
      const path = await window.desktopAPI.vault.selectDirectory?.();
      return path ?? null;
    } finally {
      setIsPickingVault(false);
    }
  }, []);

  const handleVaultCreate = useCallback(
    async (name: string, parentPath: string) => {
      setIsPickingVault(true);
      setVaultMessage(null);
      try {
        const info = await window.desktopAPI.vault.create?.({ name, parentPath });
        if (!info) {
          return;
        }
        setVault(info);
        await fetchTree(info.path);
        setSelectedEntry(null);
        setPendingSelectionPath(null);
        setPendingOpenPath(null);
      } finally {
        setIsPickingVault(false);
      }
    },
    [fetchTree, setPendingSelectionPath, setPendingOpenPath, setSelectedEntry]
  );

  const commandActions = useMemo<CommandAction[]>(() => {
    const actions: CommandAction[] = [
      {
        id: 'vault:open',
        label: vault ? t('switchVault') : t('selectVault'),
        description: vault ? t('currentVault', { path: vault.path }) : t('openFolderAsVault'),
        shortcut: '⌘O',
        handler: () => void handleVaultOpen(),
      },
      {
        id: 'vault:refresh',
        label: t('refreshFileTree'),
        description: t('rescanMarkdownFiles'),
        shortcut: '⌘R',
        disabled: !vault,
        handler: () => handleRefreshTree(),
      },
      {
        id: 'files:new-markdown',
        label: t('newMarkdownFile'),
        description: t('createNoteInDir'),
        shortcut: '⌘N',
        disabled: !vault,
        handler: () => void handleCreateFile(),
      },
      {
        id: 'files:new-folder',
        label: t('createFolderTitle'),
        description: t('createSubfolder'),
        disabled: !vault,
        handler: () => void handleCreateFolder(),
      },
      {
        id: 'files:rename',
        label: t('renameFileOrFolder'),
        description: t('renameCurrentSelection'),
        disabled: !selectedEntry,
        handler: () => void handleRenameEntry(),
      },
      {
        id: 'files:delete',
        label: t('deleteFileOrFolder'),
        description: t('deleteCurrentSelection'),
        disabled: !selectedEntry,
        handler: () => void handleDeleteEntry(),
      },
      {
        id: 'vault:show-in-finder',
        label: t('showInFinder'),
        description: t('locateInFileManager'),
        disabled: !selectedEntry,
        handler: () => {
          if (selectedEntry) {
            void handleShowInFinder(selectedEntry.path);
          }
        },
      },
    ];
    return actions;
  }, [
    vault,
    selectedEntry,
    t,
    handleVaultOpen,
    handleRefreshTree,
    handleCreateFile,
    handleCreateFolder,
    handleRenameEntry,
    handleDeleteEntry,
    handleShowInFinder,
  ]);

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

  // 切换侧边栏收起状态
  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

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
    commandActions,
    inputDialogState,
    sidebarCollapsed,
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
    onToggleSidebar: handleToggleSidebar,
  };
};
