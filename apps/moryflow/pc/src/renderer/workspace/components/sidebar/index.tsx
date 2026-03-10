/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: 侧边栏主组件（顶部 Header + 布局路由 + 底部主操作）
 *
 */

import { useCallback, useMemo } from 'react';
import type { VaultTreeNode } from '@shared/ipc';
import { TooltipProvider } from '@moryflow/ui/components/tooltip';
import { PublishDialog } from '@/components/site-publish';
import { useChatSessions } from '@/components/chat-pane/hooks';
import { SIDEBAR_GUTTER_X_CLASS } from './const';
import { ModulesNav } from './components/modules-nav';
import { SidebarBottomPrimaryAction } from './components/sidebar-bottom-primary-action';
import { SidebarHeader } from './components/sidebar-header';
import { SidebarLayoutRouter } from './components/sidebar-layout-router';
import { SidebarUpdateCard } from './components/sidebar-update-card';
import { useSidebarPublishController } from './hooks/use-sidebar-publish-controller';
import { useSyncSidebarPanelsStore } from './hooks/use-sidebar-panels-store';
import { createAgentActions } from '../../navigation/agent-actions';
import { resolveWorkspaceLayout } from '../../navigation/layout-resolver';
import {
  useWorkspaceCommand,
  useWorkspaceDoc,
  useWorkspaceNav,
  useWorkspaceShell,
  useWorkspaceTree,
  useWorkspaceVault,
} from '../../context';

export const Sidebar = () => {
  const { destination, sidebarMode, go, setSidebarMode } = useWorkspaceNav();
  const { vault } = useWorkspaceVault();
  const {
    tree,
    expandedPaths,
    treeState,
    treeError,
    selectedEntry,
    selectTreeNode,
    setExpandedPaths,
    openFileFromTree,
    renameTreeNode,
    deleteTreeNode,
    createFileInTree,
    showInFinder,
    moveTreeNode,
    createFileInRoot,
    createFolderInRoot,
  } = useWorkspaceTree();
  const { selectedFile } = useWorkspaceDoc();
  const { openCommandPalette } = useWorkspaceCommand();
  const { openSettings, requestHomeCanvas, clearHomeCanvas } = useWorkspaceShell();

  const selectedId = selectedEntry?.id ?? selectedFile?.id ?? null;
  const { openPreThread, selectSession } = useChatSessions();
  const headerMode = resolveWorkspaceLayout({
    destination,
    sidebarMode,
  }).headerMode;

  const agent = useMemo(
    () =>
      createAgentActions({
        goToAgent: () => go('agent'),
        setSidebarMode,
        selectThread: selectSession,
        openFile: openFileFromTree,
        openPreThread,
        requestHomeCanvas,
        clearHomeCanvas,
      }),
    [
      clearHomeCanvas,
      go,
      openPreThread,
      openFileFromTree,
      requestHomeCanvas,
      selectSession,
      setSidebarMode,
    ]
  );

  const {
    publishDialogOpen,
    publishSourcePaths,
    publishTitle,
    handlePublish,
    handlePublishDialogOpenChange,
  } = useSidebarPublishController({ openSettings });

  const handleCreateThread = useCallback(() => {
    agent.openNewThread({
      destination,
      sidebarMode,
      activePath: selectedFile?.path ?? null,
    });
  }, [agent, destination, selectedFile?.path, sidebarMode]);

  const handleCreateFileInRoot = useCallback(() => {
    agent.setSidebarMode('home');
    createFileInRoot();
  }, [agent, createFileInRoot]);

  const handleCreateFileInTree = useCallback(
    (node: VaultTreeNode) => {
      agent.setSidebarMode('home');
      createFileInTree(node);
    },
    [agent, createFileInTree]
  );

  const handleCreateFolderInRoot = useCallback(() => {
    agent.setSidebarMode('home');
    createFolderInRoot();
  }, [agent, createFolderInRoot]);

  const handleOpenSearch = useCallback(() => {
    openCommandPalette();
  }, [openCommandPalette]);

  useSyncSidebarPanelsStore({
    destination,
    sidebarMode,
    vault,
    tree,
    expandedPaths,
    treeState,
    treeError,
    selectedId,
    onOpenThread: agent.openThread,
    onSelectNode: selectTreeNode,
    onExpandedPathsChange: setExpandedPaths,
    onOpenFile: agent.openFile,
    onRename: renameTreeNode,
    onDelete: deleteTreeNode,
    onCreateFile: handleCreateFileInTree,
    onShowInFinder: showInFinder,
    onMove: moveTreeNode,
    onCreateFileInRoot: handleCreateFileInRoot,
    onCreateFolderInRoot: handleCreateFolderInRoot,
    onPublish: handlePublish,
  });

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-muted/30">
        <div className="shrink-0 space-y-2">
          <SidebarHeader
            mode={headerMode}
            onModeChange={setSidebarMode}
            onSearch={handleOpenSearch}
          />
          {headerMode === 'home' ? (
            <div className={SIDEBAR_GUTTER_X_CLASS}>
              <ModulesNav destination={destination} onGo={go} />
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SidebarLayoutRouter />
        </div>

        <div className={`shrink-0 space-y-2 py-2 ${SIDEBAR_GUTTER_X_CLASS}`}>
          <SidebarUpdateCard />
          <SidebarBottomPrimaryAction onClick={handleCreateThread} />
        </div>

        {publishDialogOpen ? (
          <PublishDialog
            open={publishDialogOpen}
            onOpenChange={handlePublishDialogOpenChange}
            sourcePaths={publishSourcePaths}
            title={publishTitle}
          />
        ) : null}
      </aside>
    </TooltipProvider>
  );
};
