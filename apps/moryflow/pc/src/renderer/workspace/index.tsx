/**
 * [PROPS]: DesktopWorkspaceProps
 * [EMITS]: 多个回调用于文件/文档/树操作
 * [POS]: 桌面工作区主组件，包含 UnifiedTopBar、Sidebar、Editor、Chat（含 E2E 选择器）
 */

import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { CommandPalette } from '@/components/command-palette';
import { InputDialog } from '@/components/input-dialog';
import { Skeleton } from '@anyhunt/ui/components/skeleton';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ImperativePanelHandle,
} from '@anyhunt/ui/components/resizable';
import { type SettingsSection } from '@/components/settings-dialog/const';
import { DesktopWorkspaceProps, SelectedFile } from './const';
import { EditorPanel } from './components/editor-panel';
import { UnifiedTopBar, SIDEBAR_MIN_WIDTH } from './components/unified-top-bar';
import { AI_TAB_ID, SITES_TAB_ID } from './components/unified-top-bar/helper';
import { Sidebar } from './components/sidebar';
import { SitesPage } from './components/sites';
import { VaultOnboarding } from './components/vault-onboarding';
import {
  usePerfMarker,
  useStartupPerfMarks,
  useWorkspaceChunkPreload,
} from './hooks/use-startup-perf';
import { ChatPaneWrapper } from './components/chat-pane-wrapper';

const SettingsDialog = lazy(() =>
  import('@/components/settings-dialog').then((mod) => ({ default: mod.SettingsDialog }))
);

export const DesktopWorkspace = ({
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
  onInputDialogConfirm,
  onInputDialogCancel,
  onCommandOpenChange,
  onVaultOpen,
  onSelectDirectory,
  onVaultCreate,
  onRefreshTree,
  onSelectTreeNode,
  onExpandedPathsChange,
  onOpenFile,
  onSelectTab,
  onCloseTab,
  onEditorChange,
  onRetryLoad,
  onRenameByTitle,
  onTreeNodeRename,
  onTreeNodeDelete,
  onTreeNodeCreateFile,
  onTreeNodeShowInFinder,
  onTreeNodeMove,
  onCreateFileInRoot,
  onCreateFolderInRoot,
  onToggleSidebar,
  onOpenAITab,
  onOpenSites,
}: DesktopWorkspaceProps) => {
  const markOnce = usePerfMarker();
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const chatPanelRef = useRef<ImperativePanelHandle>(null);
  const panelGroupRef = useRef<HTMLDivElement>(null);

  const handleChatReady = useCallback(() => {
    markOnce('chat:ready');
  }, [markOnce]);

  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_MIN_WIDTH);

  // 侧边栏尺寸变化时更新宽度
  const handleSidebarResize = useCallback((size: number) => {
    if (!panelGroupRef.current) return;
    const containerWidth = panelGroupRef.current.offsetWidth;
    const pixelWidth = (size / 100) * containerWidth;
    setSidebarWidth(pixelWidth);
  }, []);

  // 使用 imperative handle 控制 chat 面板折叠/展开
  const handleToggleChatPanel = useCallback(() => {
    const panel = chatPanelRef.current;
    if (!panel) return;
    if (chatCollapsed) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [chatCollapsed]);

  // 使用 imperative handle 控制侧边栏折叠/展开
  const handleToggleSidebarPanel = useCallback(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;
    if (sidebarCollapsed) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [sidebarCollapsed]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection | undefined>(undefined);
  const handleOpenSettings = useCallback((section?: SettingsSection) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  }, []);

  useStartupPerfMarks({
    treeState,
    treeLength: tree.length,
    activeDoc,
    docState,
    markOnce,
  });

  useWorkspaceChunkPreload({
    markOnce,
    handleChatReady,
  });

  const selectedId = selectedEntry?.id ?? selectedFile?.id ?? null;
  // 当前激活的 tab 路径
  const activePath = activeDoc?.path ?? selectedFile?.path ?? null;

  // 判断当前是否在特殊视图
  const isInSitesView = selectedFile?.path === SITES_TAB_ID;
  const isInAIView = selectedFile?.path === AI_TAB_ID;

  // 处理 Tab 选择
  const handleSelectTab = useCallback(
    (tab: SelectedFile) => {
      onSelectTab(tab);
    },
    [onSelectTab]
  );

  // 处理 Tab 关闭
  const handleCloseTab = useCallback(
    (path: string) => {
      onCloseTab(path);
    },
    [onCloseTab]
  );

  const chatFallback = useMemo(
    () => (
      <div className="flex h-full flex-col gap-3 px-2 py-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-10 w-40" />
      </div>
    ),
    []
  );

  const renderStartupSkeleton = useMemo(
    () => (
      <div className="flex flex-1 gap-4 bg-background px-4 py-6">
        <div className="w-1/5 space-y-3">
          <Skeleton className="h-5 w-24" />
          {[...Array(6)].map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
        <div className="w-2/5 space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-[320px] w-full" />
          <Skeleton className="h-12 w-40" />
        </div>
        <div className="w-2/5 space-y-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      </div>
    ),
    []
  );

  // 渲染主内容区（Editor、AI Chat 或 Sites）
  const renderMainContent = () => {
    // Sites 视图
    if (isInSitesView) {
      return (
        <SitesPage
          onBack={() => onCloseTab(SITES_TAB_ID)}
          currentVaultPath={vault?.path ?? ''}
          currentTree={tree}
        />
      );
    }

    // AI Tab 激活时显示全屏 Chat
    if (isInAIView) {
      return (
        <ChatPaneWrapper
          fallback={chatFallback}
          activeFilePath={activeDoc?.path ?? null}
          activeFileContent={activeDoc?.content ?? null}
          vaultPath={vault?.path ?? null}
          onReady={handleChatReady}
          collapsed={false}
          onToggleCollapse={handleToggleChatPanel}
          onOpenSettings={handleOpenSettings}
        />
      );
    }

    // 普通文件编辑模式
    return (
      <EditorPanel
        activeDoc={activeDoc}
        selectedFile={selectedFile}
        docState={docState}
        docError={docError}
        hasFiles={tree.length > 0}
        onEditorChange={onEditorChange}
        onRetryLoad={onRetryLoad}
        onRename={onRenameByTitle}
        chatCollapsed={chatCollapsed}
        onToggleChat={handleToggleChatPanel}
        onNavigateToSites={onOpenSites}
      />
    );
  };

  const renderVaultWorkspace = () => {
    if (!vault) return null;

    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        {/* 统一顶部栏 - 横跨整个窗口 */}
        <UnifiedTopBar
          tabs={openTabs}
          activePath={activePath}
          saveState={saveState}
          sidebarCollapsed={sidebarCollapsed}
          sidebarWidth={sidebarWidth}
          onToggleSidebar={handleToggleSidebarPanel}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
        />

        {/* 内容区域 */}
        <div ref={panelGroupRef} className="flex flex-1 overflow-hidden">
          <ResizablePanelGroup
            direction="horizontal"
            autoSaveId="desktop-workspace-panels"
            className="flex h-full w-full"
          >
            {/* 侧边栏区域 */}
            <ResizablePanel
              ref={sidebarPanelRef}
              defaultSize={15}
              minSize={10}
              maxSize={25}
              collapsible
              collapsedSize={0}
              onCollapse={() => !sidebarCollapsed && onToggleSidebar()}
              onExpand={() => sidebarCollapsed && onToggleSidebar()}
              onResize={handleSidebarResize}
              className={`flex min-w-0 flex-col overflow-hidden transition-all duration-200 ${
                sidebarCollapsed ? 'max-w-0' : 'min-w-[180px] max-w-[400px]'
              }`}
            >
              <Sidebar
                vault={vault}
                tree={tree}
                expandedPaths={expandedPaths}
                treeState={treeState}
                treeError={treeError}
                selectedId={selectedId}
                onSettingsOpen={handleOpenSettings}
                onSelectNode={onSelectTreeNode}
                onExpandedPathsChange={onExpandedPathsChange}
                onOpenFile={onOpenFile}
                onRename={onTreeNodeRename}
                onDelete={onTreeNodeDelete}
                onCreateFile={onTreeNodeCreateFile}
                onShowInFinder={onTreeNodeShowInFinder}
                onMove={onTreeNodeMove}
                onCreateFileInRoot={onCreateFileInRoot}
                onCreateFolderInRoot={onCreateFolderInRoot}
                onOpenAITab={onOpenAITab}
                onOpenSites={onOpenSites}
              />
            </ResizablePanel>

            {!sidebarCollapsed && <ResizableHandle />}

            {/* 主内容区 */}
            <ResizablePanel
              defaultSize={isInAIView ? 85 : chatCollapsed ? 85 : 57}
              minSize={20}
              className="flex flex-col overflow-hidden"
            >
              <div className="flex h-full flex-1 flex-col overflow-hidden border-l border-border/40 bg-background">
                {renderMainContent()}
              </div>
            </ResizablePanel>

            {/* Chat 面板（非 AI Tab 模式且非 Sites 视图时显示） */}
            {!isInAIView && !isInSitesView && (
              <>
                <ResizableHandle />
                <ResizablePanel
                  ref={chatPanelRef}
                  defaultSize={28}
                  minSize={20}
                  maxSize={70}
                  collapsible
                  collapsedSize={0}
                  onCollapse={() => !chatCollapsed && setChatCollapsed(true)}
                  onExpand={() => chatCollapsed && setChatCollapsed(false)}
                  className="flex min-w-0 flex-col overflow-hidden transition-[flex] duration-200"
                >
                  <div className="flex h-full flex-col overflow-hidden border-l border-border/40 bg-background">
                    <ChatPaneWrapper
                      fallback={chatFallback}
                      activeFilePath={activePath}
                      activeFileContent={activeDoc?.content ?? null}
                      vaultPath={vault?.path ?? null}
                      onReady={handleChatReady}
                      collapsed={chatCollapsed}
                      onToggleCollapse={handleToggleChatPanel}
                      onOpenSettings={handleOpenSettings}
                    />
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    );
  };

  const renderVaultWelcomeState = () => (
    <VaultOnboarding
      isPickingVault={isPickingVault}
      vaultMessage={vaultMessage}
      onOpenVault={onVaultOpen}
      onSelectDirectory={onSelectDirectory}
      onCreateVault={onVaultCreate}
    />
  );

  return (
    <div
      className="flex h-screen w-screen flex-col bg-muted/30 text-foreground"
      data-testid="workspace-shell"
    >
      {vault ? (
        <div className="flex flex-1 overflow-hidden">
          {treeState === 'loading' && tree.length === 0
            ? renderStartupSkeleton
            : renderVaultWorkspace()}
        </div>
      ) : (
        <>
          {/* 无 Vault 时显示顶部窗口拖拽区域 */}
          <header className="window-drag-region h-10 shrink-0" />
          <div className="flex flex-1 overflow-hidden">{renderVaultWelcomeState()}</div>
        </>
      )}
      <CommandPalette
        open={commandOpen}
        onOpenChange={onCommandOpenChange}
        actions={commandActions}
      />
      <InputDialog
        open={inputDialogState.open}
        title={inputDialogState.title}
        description={inputDialogState.description}
        defaultValue={inputDialogState.defaultValue}
        placeholder={inputDialogState.placeholder}
        onConfirm={onInputDialogConfirm}
        onCancel={onInputDialogCancel}
      />
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            initialSection={settingsSection}
            vaultPath={vault?.path}
          />
        </Suspense>
      )}
    </div>
  );
};
