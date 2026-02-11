/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: 侧边栏主组件（Notion-ish skeleton）：WorkspaceSelector/Search/Modules/AgentSub/Section/BottomTools（就地读取 workspace contexts）
 *
 * [UPDATE]: 2026-02-09 - Publish 入口未登录时不再触发后台请求，改为引导登录（Account 设置页）
 * [UPDATE]: 2026-02-10 - destination!=agent 时 New thread/New file 作为 Open intent：回跳到 Agent 后再执行创建
 * [UPDATE]: 2026-02-10 - 文件树内的新建文件也视为 Open intent：回跳到 Agent/Workspace 后再创建
 * [UPDATE]: 2026-02-10 - Sidebar 顶部布局调整：Sites 全局置顶；Workspace 行下移；去掉 Agent 文本标签；Pages 统一为 Files
 * [UPDATE]: 2026-02-11 - 顶部结构微调：Search 并入 Modules 列表首项；Workspace 行保持左侧大区、右侧固定宽度胶囊切换
 * [UPDATE]: 2026-02-11 - AgentSub 切换胶囊收敛为紧凑尺寸，避免最小宽度下占比过高
 * [UPDATE]: 2026-02-11 - 侧边栏横向对齐收敛：统一父容器 gutter，消除顶部分组的嵌套 padding 偏移
 * [UPDATE]: 2026-02-11 - 外层容器横向 gutter 调整为 px-3.5，收敛留白并保持全区对齐
 * [UPDATE]: 2026-02-11 - 横向 gutter 收敛为单一来源：顶部/分隔线/标题/工具区统一复用 sidebar 常量，thread/file 列表保留独立 inset 规则
 * [UPDATE]: 2026-02-11 - Modules 顶部新增 New thread 快捷入口，复用 Threads 区创建逻辑
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { VaultTreeNode } from '@shared/ipc';
import { ScrollArea } from '@anyhunt/ui/components/scroll-area';
import { TooltipProvider } from '@anyhunt/ui/components/tooltip';
import { PublishDialog } from '@/components/site-publish';
import { useChatSessions } from '@/components/chat-pane/hooks';
import { ChatThreadsList } from './components/chat-threads-list';
import { AgentSubSwitcher } from './components/agent-sub-switcher';
import { ModulesNav } from './components/modules-nav';
import { SearchDialog } from './components/search-dialog';
import { SidebarFiles } from './components/sidebar-files';
import { SidebarSectionHeader } from './components/sidebar-section-header';
import { SidebarTools } from './components/sidebar-tools';
import { SidebarCreateMenu } from './components/sidebar-create-menu';
import { VaultSelector } from './components/vault-selector';
import { SIDEBAR_GUTTER_X_CLASS } from './const';
import { useRequireLoginForSitePublish } from '../../hooks/use-require-login-for-site-publish';
import { createAgentActions } from '../../navigation/agent-actions';
import {
  useWorkspaceCommand,
  useWorkspaceDoc,
  useWorkspaceNav,
  useWorkspaceShell,
  useWorkspaceTree,
  useWorkspaceVault,
} from '../../context';

export const Sidebar = () => {
  const { destination, agentSub, go, setSub } = useWorkspaceNav();
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

  // 文件搜索对话框状态（仅 agentSub=workspace 使用）
  const [searchOpen, setSearchOpen] = useState(false);

  // Keep-alive：避免 agentSub 切换时反复 mount 重组件（文件树/线程列表）。
  const [chatPaneMounted, setChatPaneMounted] = useState(agentSub === 'chat');
  const [workspacePaneMounted, setWorkspacePaneMounted] = useState(agentSub === 'workspace');
  useEffect(() => {
    if (agentSub === 'chat') {
      setChatPaneMounted(true);
    }
    if (agentSub === 'workspace') {
      setWorkspacePaneMounted(true);
    }
  }, [agentSub]);

  // 发布对话框状态
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishSourcePaths, setPublishSourcePaths] = useState<string[]>([]);
  const [publishTitle, setPublishTitle] = useState<string | undefined>();

  const { authLoading, isAuthenticated, requireLoginForSitePublish } =
    useRequireLoginForSitePublish(openSettings);

  const agent = useMemo(
    () =>
      createAgentActions({
        setSub,
        selectThread: selectSession,
        openFile: openFileFromTree,
      }),
    [setSub, selectSession, openFileFromTree]
  );

  const handlePublish = useCallback(
    (node: VaultTreeNode) => {
      if (!requireLoginForSitePublish()) return;
      setPublishSourcePaths([node.path]);
      setPublishTitle(node.name.replace(/\.md$/, ''));
      setPublishDialogOpen(true);
    },
    [requireLoginForSitePublish]
  );

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) return;
    if (!publishDialogOpen) return;

    setPublishDialogOpen(false);
    setPublishSourcePaths([]);
    setPublishTitle(undefined);
  }, [authLoading, isAuthenticated, publishDialogOpen]);

  const handleSearchSelect = useCallback(
    (node: VaultTreeNode) => {
      agent.openFile(node);
    },
    [agent]
  );

  const sectionTitle = agentSub === 'chat' ? 'Threads' : 'Files';
  const handleCreateThread = useCallback(() => {
    // Treat "create thread" as an Open intent: user expects to land in Agent/Chat.
    agent.setSub('chat');
    void createSession();
  }, [agent, createSession]);

  const handleCreateFileInRoot = useCallback(() => {
    // Treat "create file" as an Open intent: user expects to land in Agent/Workspace.
    agent.setSub('workspace');
    createFileInRoot();
  }, [agent, createFileInRoot]);

  const handleCreateFileInTree = useCallback(
    (node: VaultTreeNode) => {
      // Treat "create file" as an Open intent: user expects to land in Agent/Workspace.
      agent.setSub('workspace');
      createFileInTree(node);
    },
    [agent, createFileInTree]
  );

  const handleCreateFolderInRoot = useCallback(() => {
    agent.setSub('workspace');
    createFolderInRoot();
  }, [agent, createFolderInRoot]);

  const handleOpenSearch = useCallback(() => {
    if (agentSub === 'workspace') {
      setSearchOpen(true);
    } else {
      openCommandPalette();
    }
  }, [agentSub, openCommandPalette]);

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-muted/30">
        {/* 顶部骨架：Modules（含 Search） + Workspace row（vault/agent-sub） */}
        <div className={`shrink-0 space-y-2 pt-2 ${SIDEBAR_GUTTER_X_CLASS}`}>
          {/* Modules（全局） */}
          <ModulesNav
            onCreateThread={handleCreateThread}
            destination={destination}
            onGo={go}
            onSearch={handleOpenSearch}
          />

          {/* Workspace 行：左侧 Workspace，右侧固定宽度紧凑胶囊切换 */}
          <div className="flex w-full items-center gap-2">
            <div className="min-w-0 flex-1">
              <VaultSelector triggerClassName="focus-visible:ring-2 focus-visible:ring-ring/50" />
            </div>
            <div className="w-[84px] shrink-0">
              <AgentSubSwitcher
                destination={destination}
                agentSub={agentSub}
                onChange={agent.setSub}
              />
            </div>
          </div>
        </div>

        {/* 内容区（独立滚动） */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SidebarSectionHeader
            title={sectionTitle}
            onAdd={agentSub === 'chat' ? handleCreateThread : undefined}
            addControl={
              agentSub === 'workspace' ? (
                <SidebarCreateMenu
                  onCreateFile={handleCreateFileInRoot}
                  onCreateFolder={handleCreateFolderInRoot}
                />
              ) : undefined
            }
            addLabel={agentSub === 'chat' ? 'New thread' : 'New file'}
          />

          <ScrollArea className="min-h-0 flex-1">
            <div
              id="agent-sub-panel-chat"
              role="tabpanel"
              aria-labelledby="agent-sub-tab-chat"
              hidden={agentSub !== 'chat'}
              className={agentSub === 'chat' ? 'block' : 'hidden'}
            >
              {chatPaneMounted && <ChatThreadsList onOpenThread={agent.openThread} />}
            </div>

            <div
              id="agent-sub-panel-workspace"
              role="tabpanel"
              aria-labelledby="agent-sub-tab-workspace"
              hidden={agentSub !== 'workspace'}
              className={agentSub === 'workspace' ? 'block' : 'hidden'}
            >
              {workspacePaneMounted && (
                <SidebarFiles
                  vault={vault}
                  tree={tree}
                  expandedPaths={expandedPaths}
                  treeState={treeState}
                  treeError={treeError}
                  selectedId={selectedId}
                  onSelectNode={selectTreeNode}
                  onExpandedPathsChange={setExpandedPaths}
                  onOpenFile={agent.openFile}
                  onRename={renameTreeNode}
                  onDelete={deleteTreeNode}
                  onCreateFile={handleCreateFileInTree}
                  onShowInFinder={showInFinder}
                  onMove={moveTreeNode}
                  onCreateFileInRoot={handleCreateFileInRoot}
                  onCreateFolderInRoot={handleCreateFolderInRoot}
                  onPublish={handlePublish}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 分隔线 */}
        <div className={`shrink-0 border-t border-border/40 ${SIDEBAR_GUTTER_X_CLASS}`} />

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
        {publishDialogOpen ? (
          <PublishDialog
            open={publishDialogOpen}
            onOpenChange={setPublishDialogOpen}
            sourcePaths={publishSourcePaths}
            title={publishTitle}
          />
        ) : null}
      </aside>
    </TooltipProvider>
  );
};
