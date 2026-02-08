/**
 * [PROPS]: DesktopWorkspaceProps
 * [EMITS]: 多个回调用于文件/文档/树操作
 * [POS]: 桌面工作区主组件（Mode-aware）：Shell（Sidebar + Main）+ Workspace 内部分栏（Editor + Chat）
 * [UPDATE]: 2026-02-08 - 修复 Chat/Sites 主视图容器布局语义，确保占满主内容区（避免被 flex row + sibling 占位挤到右侧）
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Sidebar } from './components/sidebar';
import { SitesPage } from './components/sites';
import { VaultOnboarding } from './components/vault-onboarding';
import {
  usePerfMarker,
  useStartupPerfMarks,
  useWorkspaceChunkPreload,
} from './hooks/use-startup-perf';
import { ChatPanePortal } from './components/chat-pane-portal';
import { useAppMode } from './hooks/use-app-mode';

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
}: DesktopWorkspaceProps) => {
  const markOnce = usePerfMarker();
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const workspaceChatPanelRef = useRef<ImperativePanelHandle>(null);
  const panelGroupRef = useRef<HTMLDivElement>(null);
  const sidebarSizeRef = useRef<number | null>(null);

  const handleChatReady = useCallback(() => {
    markOnce('chat:ready');
  }, [markOnce]);

  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_MIN_WIDTH);
  const { mode, setMode } = useAppMode();

  // Keep-alive main views so switching modes is instant after the first mount.
  const [workspaceMainMounted, setWorkspaceMainMounted] = useState(mode === 'workspace');
  const [sitesMainMounted, setSitesMainMounted] = useState(mode === 'sites');

  useEffect(() => {
    if (mode === 'workspace') {
      setWorkspaceMainMounted(true);
    }
    if (mode === 'sites') {
      setSitesMainMounted(true);
    }
  }, [mode]);

  // Warm up heavy views in idle so first-time switching feels instant.
  useEffect(() => {
    if (!vault) return;
    if (treeState !== 'idle') return;
    if (workspaceMainMounted && sitesMainMounted) return;

    const warm = () => {
      setWorkspaceMainMounted(true);
      setSitesMainMounted(true);
    };

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(id);
    }

    const timer = window.setTimeout(warm, 600);
    return () => window.clearTimeout(timer);
  }, [vault, treeState, workspaceMainMounted, sitesMainMounted]);

  // ChatPane portal targets:
  // - Chat Mode: render in main area
  // - Workspace Mode: render in right assistant panel
  // - Sites Mode: keep alive in a hidden parking host (not visible)
  const [chatMainHost, setChatMainHost] = useState<HTMLElement | null>(null);
  const [chatPanelHost, setChatPanelHost] = useState<HTMLElement | null>(null);
  const [chatParkingHost, setChatParkingHost] = useState<HTMLElement | null>(null);

  // 侧边栏尺寸变化时更新宽度
  const handleSidebarResize = useCallback((size: number) => {
    sidebarSizeRef.current = size;
    if (!panelGroupRef.current) return;
    const containerWidth = panelGroupRef.current.offsetWidth;
    const pixelWidth = (size / 100) * containerWidth;
    setSidebarWidth(pixelWidth);
  }, []);

  // 使用 imperative handle 控制 Workspace 内 assistant panel 折叠/展开
  const handleToggleChatPanel = useCallback(() => {
    const panel = workspaceChatPanelRef.current;
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

  const renderVaultWorkspace = () => {
    if (!vault) return null;

    const shouldMountWorkspaceMain = workspaceMainMounted || mode === 'workspace';
    const shouldMountSitesMain = sitesMainMounted || mode === 'sites';

    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        {/* 统一顶部栏 - 横跨整个窗口 */}
        <UnifiedTopBar
          tabs={mode === 'workspace' ? openTabs : []}
          activePath={mode === 'workspace' ? activePath : null}
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
            autoSaveId="desktop-workspace-shell-panels"
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
              className={`flex min-w-0 flex-col overflow-hidden ${
                sidebarCollapsed ? 'max-w-0' : 'min-w-[180px] max-w-[400px]'
              }`}
            >
              <Sidebar
                mode={mode}
                onModeChange={setMode}
                onOpenCommandPalette={() => onCommandOpenChange(true)}
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
              />
            </ResizablePanel>

            {!sidebarCollapsed && <ResizableHandle />}

            {/* 主内容区 */}
            <ResizablePanel
              defaultSize={85}
              minSize={50}
              className="flex min-w-0 flex-col overflow-hidden"
            >
              <div className="flex h-full flex-1 flex-col overflow-hidden border-l border-border/40 bg-background">
                {/* Chat Mode 主视图容器（ChatPane 通过 Portal 渲染到这里） */}
                <div
                  ref={setChatMainHost}
                  className={mode === 'chat' ? 'min-h-0 flex-1 min-w-0 overflow-hidden' : 'hidden'}
                />

                {/* Parking host: keep ChatPane mounted when in Sites mode (not visible, no layout impact). */}
                <div ref={setChatParkingHost} className="hidden" />

                {/* Workspace Mode：Editor + Assistant panel（可 resize/collapse） */}
                {shouldMountWorkspaceMain && (
                  <div
                    className={
                      mode === 'workspace' ? 'min-h-0 flex-1 min-w-0 overflow-hidden' : 'hidden'
                    }
                  >
                    <ResizablePanelGroup
                      direction="horizontal"
                      autoSaveId="desktop-workspace-workspace-panels"
                      className="flex h-full w-full"
                    >
                      <ResizablePanel defaultSize={72} minSize={30} className="min-w-0">
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
                          onNavigateToSites={() => setMode('sites')}
                        />
                      </ResizablePanel>

                      <ResizableHandle />

                      <ResizablePanel
                        ref={workspaceChatPanelRef}
                        defaultSize={28}
                        minSize={0}
                        maxSize={70}
                        collapsible
                        collapsedSize={0}
                        onCollapse={() => !chatCollapsed && setChatCollapsed(true)}
                        onExpand={() => chatCollapsed && setChatCollapsed(false)}
                        className="flex flex-col overflow-hidden min-w-[360px] data-[panel-size=0.0]:min-w-0"
                      >
                        <div className="flex h-full flex-col overflow-hidden border-l border-border/40 bg-background">
                          <div
                            ref={setChatPanelHost}
                            className="min-h-0 flex-1 min-w-0 overflow-hidden"
                          />
                        </div>
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </div>
                )}

                {/* Sites Mode */}
                {shouldMountSitesMain && (
                  <div
                    className={
                      mode === 'sites' ? 'min-h-0 flex-1 min-w-0 overflow-hidden' : 'hidden'
                    }
                  >
                    <SitesPage currentVaultPath={vault?.path ?? ''} currentTree={tree} />
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          <ChatPanePortal
            mode={mode}
            fallback={chatFallback}
            mainHost={chatMainHost}
            panelHost={chatPanelHost}
            parkingHost={chatParkingHost}
            activeFilePath={activePath}
            activeFileContent={activeDoc?.content ?? null}
            vaultPath={vault?.path ?? null}
            chatCollapsed={chatCollapsed}
            onToggleCollapse={handleToggleChatPanel}
            onOpenSettings={handleOpenSettings}
            onReady={handleChatReady}
          />
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
