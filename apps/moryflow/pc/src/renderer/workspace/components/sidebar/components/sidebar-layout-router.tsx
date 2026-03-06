/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: Sidebar 内容区布局分发（Home/Chat）
 * [UPDATE]: 2026-02-28 - Home Files 标题行恢复历史样式：右侧使用 + 下拉创建菜单
 */

import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { useSidebarPanelsStore } from '../hooks/use-sidebar-panels-store';
import { SIDEBAR_GUTTER_X_CLASS } from '../const';
import { ChatThreadsList } from './chat-threads-list';
import { SidebarCreateMenu } from './sidebar-create-menu';
import { SidebarFiles } from './sidebar-files';
import { resolveSidebarContentMode } from './sidebar-layout-router-model';
import { VaultSelector } from './vault-selector';

export const SidebarLayoutRouter = () => {
  const destination = useSidebarPanelsStore((state) => state.destination);
  const sidebarMode = useSidebarPanelsStore((state) => state.sidebarMode);
  const vault = useSidebarPanelsStore((state) => state.vault);
  const tree = useSidebarPanelsStore((state) => state.tree);
  const expandedPaths = useSidebarPanelsStore((state) => state.expandedPaths);
  const treeState = useSidebarPanelsStore((state) => state.treeState);
  const treeError = useSidebarPanelsStore((state) => state.treeError);
  const selectedId = useSidebarPanelsStore((state) => state.selectedId);
  const onOpenThread = useSidebarPanelsStore((state) => state.onOpenThread);
  const onSelectNode = useSidebarPanelsStore((state) => state.onSelectNode);
  const onExpandedPathsChange = useSidebarPanelsStore((state) => state.onExpandedPathsChange);
  const onOpenFile = useSidebarPanelsStore((state) => state.onOpenFile);
  const onRename = useSidebarPanelsStore((state) => state.onRename);
  const onDelete = useSidebarPanelsStore((state) => state.onDelete);
  const onCreateFile = useSidebarPanelsStore((state) => state.onCreateFile);
  const onShowInFinder = useSidebarPanelsStore((state) => state.onShowInFinder);
  const onMove = useSidebarPanelsStore((state) => state.onMove);
  const onCreateFileInRoot = useSidebarPanelsStore((state) => state.onCreateFileInRoot);
  const onCreateFolderInRoot = useSidebarPanelsStore((state) => state.onCreateFolderInRoot);
  const onPublish = useSidebarPanelsStore((state) => state.onPublish);

  const mode = resolveSidebarContentMode(destination, sidebarMode);

  if (mode === 'chat') {
    return (
      <div
        id="sidebar-mode-panel-chat"
        role="tabpanel"
        aria-labelledby="sidebar-mode-tab-chat"
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className={`shrink-0 py-1.5 ${SIDEBAR_GUTTER_X_CLASS}`}>
          <p className="truncate text-xs font-medium text-muted-foreground">Threads</p>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <ChatThreadsList onOpenThread={onOpenThread} />
        </ScrollArea>
      </div>
    );
  }

  return (
    <div
      id="sidebar-mode-panel-home"
      role="tabpanel"
      aria-labelledby="sidebar-mode-tab-home"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className={`shrink-0 py-1.5 ${SIDEBAR_GUTTER_X_CLASS}`}>
        <VaultSelector triggerClassName="focus-visible:ring-2 focus-visible:ring-ring/50" />
      </div>
      <div className={`shrink-0 py-1.5 ${SIDEBAR_GUTTER_X_CLASS}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium text-muted-foreground">Files</p>
          <SidebarCreateMenu
            onCreateFile={onCreateFileInRoot}
            onCreateFolder={onCreateFolderInRoot}
          />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <SidebarFiles
          vault={vault}
          tree={tree}
          expandedPaths={expandedPaths}
          treeState={treeState}
          treeError={treeError}
          selectedId={selectedId}
          onSelectNode={onSelectNode}
          onExpandedPathsChange={onExpandedPathsChange}
          onOpenFile={onOpenFile}
          onRename={onRename}
          onDelete={onDelete}
          onCreateFile={onCreateFile}
          onShowInFinder={onShowInFinder}
          onMove={onMove}
          onCreateFileInRoot={onCreateFileInRoot}
          onCreateFolderInRoot={onCreateFolderInRoot}
          onPublish={onPublish}
        />
      </ScrollArea>
    </div>
  );
};
