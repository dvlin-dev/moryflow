/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: 侧边栏主组件（Notion-ish skeleton）：WorkspaceSelector/Search/ModeSwitcher/Section/BottomTools（就地读取 workspace contexts）
 */

import { useCallback, useEffect, useState } from 'react';
import type { VaultTreeNode } from '@shared/ipc';
import { ScrollArea } from '@anyhunt/ui/components/scroll-area';
import { TooltipProvider } from '@anyhunt/ui/components/tooltip';
import { Search } from 'lucide-react';
import { PublishDialog } from '@/components/site-publish';
import { useChatSessions } from '@/components/chat-pane/hooks';
import { ChatThreadsList } from './components/chat-threads-list';
import { ModeSwitcher } from './components/mode-switcher';
import { SearchDialog } from './components/search-dialog';
import { SidebarFiles } from './components/sidebar-files';
import { SidebarSectionHeader } from './components/sidebar-section-header';
import { SidebarTools } from './components/sidebar-tools';
import { SidebarCreateMenu } from './components/sidebar-create-menu';
import { VaultSelector } from './components/vault-selector';
import { cn } from '@/lib/utils';
import {
  useWorkspaceCommand,
  useWorkspaceDoc,
  useWorkspaceMode,
  useWorkspaceShell,
  useWorkspaceTree,
  useWorkspaceVault,
} from '../../context';

export const Sidebar = () => {
  const { mode, setMode } = useWorkspaceMode();
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
  const { createSession } = useChatSessions();

  // 文件搜索对话框状态（仅 Workspace Mode 使用）
  const [searchOpen, setSearchOpen] = useState(false);

  // Keep-alive：避免 mode 切换时反复 mount 重组件（文件树/线程列表）。
  const [workspacePaneMounted, setWorkspacePaneMounted] = useState(mode === 'workspace');
  useEffect(() => {
    if (mode === 'workspace') {
      setWorkspacePaneMounted(true);
    }
  }, [mode]);

  // 发布对话框状态
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishSourcePaths, setPublishSourcePaths] = useState<string[]>([]);
  const [publishTitle, setPublishTitle] = useState<string | undefined>();

  const handlePublish = useCallback((node: VaultTreeNode) => {
    setPublishSourcePaths([node.path]);
    setPublishTitle(node.name.replace(/\.md$/, ''));
    setPublishDialogOpen(true);
  }, []);

  const handleSearchSelect = useCallback(
    (node: VaultTreeNode) => {
      openFileFromTree(node);
    },
    [openFileFromTree]
  );

  const sectionTitle = mode === 'chat' ? 'Threads' : mode === 'sites' ? 'Sites' : 'Pages';
  const handleCreateThread = useCallback(() => {
    void createSession();
  }, [createSession]);

  const handleOpenSearch = useCallback(() => {
    if (mode === 'workspace') {
      setSearchOpen(true);
    } else {
      openCommandPalette();
    }
  }, [mode, openCommandPalette]);

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-muted/30">
        {/* 顶部骨架：Workspace Selector + Search + Mode Switcher */}
        <div className="shrink-0 space-y-2 px-2 pt-2">
          {/* 顶部 Workspace 行：左侧 Workspace 下拉，右侧统一 Search 入口 */}
          <div className="flex w-full items-center gap-2">
            <div className="min-w-0 flex-1">
              <VaultSelector triggerClassName="focus-visible:ring-2 focus-visible:ring-ring/50" />
            </div>
            <button
              type="button"
              onClick={handleOpenSearch}
              className={cn(
                'shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors',
                'hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50'
              )}
              aria-label="Search"
            >
              <Search className="size-4" />
            </button>
          </div>

          <div className="px-1.5">
            <ModeSwitcher mode={mode} onModeChange={setMode} />
          </div>
        </div>

        {/* 分隔线 */}
        <div className="mx-2 mt-2 shrink-0 border-t border-border/40" />

        {/* 内容区（独立滚动） */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SidebarSectionHeader
            title={sectionTitle}
            onAdd={mode === 'chat' ? handleCreateThread : undefined}
            addControl={
              mode === 'workspace' ? (
                <SidebarCreateMenu
                  onCreatePage={createFileInRoot}
                  onCreateFolder={createFolderInRoot}
                />
              ) : undefined
            }
            addLabel={mode === 'chat' ? 'New thread' : mode === 'workspace' ? 'New page' : 'New'}
          />

          <ScrollArea className="min-h-0 flex-1">
            <div className={mode === 'chat' ? 'block' : 'hidden'}>
              <ChatThreadsList />
            </div>

            <div className={mode === 'workspace' ? 'block' : 'hidden'}>
              {(workspacePaneMounted || mode === 'workspace') && (
                <SidebarFiles
                  vault={vault}
                  tree={tree}
                  expandedPaths={expandedPaths}
                  treeState={treeState}
                  treeError={treeError}
                  selectedId={selectedId}
                  onSelectNode={selectTreeNode}
                  onExpandedPathsChange={setExpandedPaths}
                  onOpenFile={openFileFromTree}
                  onRename={renameTreeNode}
                  onDelete={deleteTreeNode}
                  onCreateFile={createFileInTree}
                  onShowInFinder={showInFinder}
                  onMove={moveTreeNode}
                  onCreateFileInRoot={createFileInRoot}
                  onCreateFolderInRoot={createFolderInRoot}
                  onPublish={handlePublish}
                />
              )}
            </div>

            <div className={mode === 'sites' ? 'block' : 'hidden'}>
              <div className="px-3 py-3 text-sm text-muted-foreground">
                Manage sites in the main panel.
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* 分隔线 */}
        <div className="mx-2 shrink-0 border-t border-border/40" />

        {/* 工具区（固定在底部） */}
        <div className="shrink-0">
          <SidebarTools vault={vault} onSettingsOpen={openSettings} />
        </div>

        {/* Workspace 搜索对话框 */}
        <SearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          tree={tree}
          onSelectFile={handleSearchSelect}
        />

        {/* 发布对话框 */}
        <PublishDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          sourcePaths={publishSourcePaths}
          title={publishTitle}
        />
      </aside>
    </TooltipProvider>
  );
};
