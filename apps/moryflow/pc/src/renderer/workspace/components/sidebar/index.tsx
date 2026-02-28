/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: 侧边栏主组件（顶部 Header + 布局路由 + 底部主操作）
 *
 * [UPDATE]: 2026-02-28 - 侧栏重构为 Home/Chat 顶部切换；Search 固定右上 icon；底部固定 New chat
 * [UPDATE]: 2026-02-28 - 删除旧中段切换与 SearchDialog 分叉逻辑；搜索统一走全局搜索面板
 * [UPDATE]: 2026-02-28 - 底部区域收敛为单一 New chat 按钮，移除分割线与同步状态信息
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
import { useSidebarPublishController } from './hooks/use-sidebar-publish-controller';
import { useSyncSidebarPanelsStore } from './hooks/use-sidebar-panels-store';
import { createAgentActions } from '../../navigation/agent-actions';
import {
  useWorkspaceCommand,
  useWorkspaceDoc,
  useWorkspaceNav,
  useWorkspaceShell,
  useWorkspaceTree,
  useWorkspaceVault,
} from '../../context';
import type { Destination, SidebarMode } from '../../navigation/state';

const resolveHeaderMode = (destination: Destination, mode: SidebarMode): SidebarMode =>
  destination === 'agent' ? mode : 'home';

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
  const { openSettings } = useWorkspaceShell();

  const selectedId = selectedEntry?.id ?? selectedFile?.id ?? null;
  const { createSession, selectSession } = useChatSessions();
  const headerMode = resolveHeaderMode(destination, sidebarMode);

  const agent = useMemo(
    () =>
      createAgentActions({
        setSidebarMode,
        selectThread: selectSession,
        openFile: openFileFromTree,
      }),
    [setSidebarMode, selectSession, openFileFromTree]
  );

  const {
    publishDialogOpen,
    publishSourcePaths,
    publishTitle,
    handlePublish,
    handlePublishDialogOpenChange,
  } = useSidebarPublishController({ openSettings });

  const handleCreateThread = useCallback(() => {
    agent.setSidebarMode('chat');
    void createSession();
  }, [agent, createSession]);

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

        <div className="min-h-0 flex-1 overflow-hidden">
          <SidebarLayoutRouter />
        </div>

        <div className={`shrink-0 py-2 ${SIDEBAR_GUTTER_X_CLASS}`}>
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
