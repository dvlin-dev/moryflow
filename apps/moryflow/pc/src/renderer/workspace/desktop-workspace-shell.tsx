/**
 * [INPUT]: workspace/controller contexts + shell UI state（panel refs）
 * [OUTPUT]: Navigation-aware Workspace Shell（Sidebar + Main + Panels）
 * [POS]: DesktopWorkspaceShell - 桌面工作区主视图壳层（负责布局与 panel 行为，不承载业务状态）
 */

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { UnifiedTopBar, SIDEBAR_MIN_WIDTH } from './components/unified-top-bar';
import { Sidebar } from './components/sidebar';
import { SitesPage } from './components/sites';
import { VaultOnboarding } from './components/vault-onboarding';
import { EditorPanel } from './components/editor-panel';
import {
  usePerfMarker,
  useFirstInteraction,
  useStartupPerfMarks,
  useWorkspaceWarmup,
} from './hooks/use-startup-perf';
import { ChatPanePortal } from './components/chat-pane-portal';
import {
  WorkspaceShellProvider,
  useWorkspaceCommand,
  useWorkspaceDialog,
  useWorkspaceDoc,
  useWorkspaceNav,
  useWorkspaceTree,
  useWorkspaceVault,
} from './context';

const SettingsDialog = lazy(() =>
  import('@/components/settings-dialog').then((mod) => ({ default: mod.SettingsDialog }))
);

export const DesktopWorkspaceShell = () => {
  const markOnce = usePerfMarker();
  const hasInteracted = useFirstInteraction({ markOnce });

  const { destination, agentSub } = useWorkspaceNav();
  const { vault } = useWorkspaceVault();
  const { tree, treeState } = useWorkspaceTree();
  const { selectedFile, activeDoc, docState } = useWorkspaceDoc();
  const { commandOpen, setCommandOpen, commandActions } = useWorkspaceCommand();
  const { inputDialogState, confirmInputDialog, cancelInputDialog } = useWorkspaceDialog();

  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const workspaceChatPanelRef = useRef<ImperativePanelHandle>(null);
  const panelGroupRef = useRef<HTMLDivElement>(null);
  const sidebarSizePercentRef = useRef<number>(15);

  const handleChatReady = useCallback(() => {
    markOnce('chat:ready');
  }, [markOnce]);

  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_MIN_WIDTH);

  // Keep-alive main views so switching destination/agentSub is instant after the first mount.
  const [workspaceMainMounted, setWorkspaceMainMounted] = useState(agentSub === 'workspace');
  const [sitesMainMounted, setSitesMainMounted] = useState(destination === 'sites');

  useEffect(() => {
    if (agentSub === 'workspace') {
      setWorkspaceMainMounted(true);
    }
    if (destination === 'sites') {
      setSitesMainMounted(true);
    }
  }, [agentSub, destination]);

  // ChatPane portal targets:
  // - destination=agent, agentSub=chat: render in main area
  // - destination=agent, agentSub=workspace: render in right assistant panel
  // - destination=sites: keep alive in a hidden parking host (not visible)
  const [chatMainHost, setChatMainHost] = useState<HTMLElement | null>(null);
  const [chatPanelHost, setChatPanelHost] = useState<HTMLElement | null>(null);
  const [chatParkingHost, setChatParkingHost] = useState<HTMLElement | null>(null);

  const updateSidebarWidthFromPercent = useCallback((sizePercent: number) => {
    const containerWidth = panelGroupRef.current?.offsetWidth;
    if (!containerWidth) return;
    const pixelWidth = (sizePercent / 100) * containerWidth;
    setSidebarWidth((prev) => (Math.abs(prev - pixelWidth) < 0.5 ? prev : pixelWidth));
  }, []);

  const syncSidebarStateFromPanel = useCallback(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;

    const isCollapsed = panel.isCollapsed();
    setSidebarCollapsed((prev) => (prev === isCollapsed ? prev : isCollapsed));

    const sizePercent = panel.getSize();
    sidebarSizePercentRef.current = sizePercent;
    updateSidebarWidthFromPercent(sizePercent);
  }, [updateSidebarWidthFromPercent]);

  // 侧边栏尺寸变化时更新宽度
  const handleSidebarResize = useCallback(
    (size: number) => {
      sidebarSizePercentRef.current = size;
      updateSidebarWidthFromPercent(size);
    },
    [updateSidebarWidthFromPercent]
  );

  // 首帧与恢复布局：同步 collapsed/width（避免重启后状态错位）
  useLayoutEffect(() => {
    syncSidebarStateFromPanel();
    const id = window.requestAnimationFrame(syncSidebarStateFromPanel);
    return () => window.cancelAnimationFrame(id);
  }, [syncSidebarStateFromPanel]);

  // 窗口/容器宽度变化时重算 sidebarWidth（percent 不变，px 会变）
  useEffect(() => {
    const el = panelGroupRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      const sizePercent = sidebarPanelRef.current?.getSize() ?? sidebarSizePercentRef.current;
      updateSidebarWidthFromPercent(sizePercent);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateSidebarWidthFromPercent]);

  // 使用 imperative handle 控制 Workspace 内 assistant panel 折叠/展开
  const toggleChatPanel = useCallback(() => {
    const panel = workspaceChatPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
      setChatCollapsed(false);
    } else {
      panel.collapse();
      setChatCollapsed(true);
    }
  }, []);

  const syncChatCollapsedFromPanel = useCallback(() => {
    const panel = workspaceChatPanelRef.current;
    if (!panel) return;
    const isCollapsed = panel.isCollapsed();
    setChatCollapsed((prev) => (prev === isCollapsed ? prev : isCollapsed));
  }, []);

  // 首次挂载 Workspace panel group / 恢复布局时，同步 chatCollapsed
  useLayoutEffect(() => {
    if (!workspaceMainMounted) return;
    syncChatCollapsedFromPanel();
    const id = window.requestAnimationFrame(syncChatCollapsedFromPanel);
    return () => window.cancelAnimationFrame(id);
  }, [workspaceMainMounted, syncChatCollapsedFromPanel]);

  // 使用 imperative handle 控制侧边栏折叠/展开
  const toggleSidebarPanel = useCallback(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
      setSidebarCollapsed(false);
    } else {
      panel.collapse();
      setSidebarCollapsed(true);
    }
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection | undefined>(undefined);
  const openSettings = useCallback((section?: SettingsSection) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  }, []);

  const shellController = useMemo(
    () => ({
      sidebarCollapsed,
      sidebarWidth,
      toggleSidebarPanel,
      chatCollapsed,
      toggleChatPanel,
      openSettings,
    }),
    [
      sidebarCollapsed,
      sidebarWidth,
      toggleSidebarPanel,
      chatCollapsed,
      toggleChatPanel,
      openSettings,
    ]
  );

  useStartupPerfMarks({
    treeState,
    treeLength: tree.length,
    activeDoc,
    docState,
    markOnce,
  });

  useWorkspaceWarmup({
    enabled: Boolean(vault) && treeState === 'idle',
    hasInteracted,
  });

  const activePath = activeDoc?.path ?? selectedFile?.path ?? null;

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

    const isChatView = destination === 'agent' && agentSub === 'chat';
    const isWorkspaceView = destination === 'agent' && agentSub === 'workspace';
    const isSitesView = destination === 'sites';

    const shouldMountWorkspaceMain = workspaceMainMounted || isWorkspaceView;
    const shouldMountSitesMain = sitesMainMounted || isSitesView;

    return (
      <WorkspaceShellProvider value={shellController}>
        <div className="flex h-full w-full flex-col overflow-hidden">
          <UnifiedTopBar />

          <div ref={panelGroupRef} className="flex flex-1 overflow-hidden">
            <ResizablePanelGroup
              direction="horizontal"
              autoSaveId="desktop-workspace-shell-panels"
              className="flex h-full w-full"
            >
              <ResizablePanel
                ref={sidebarPanelRef}
                defaultSize={15}
                minSize={10}
                maxSize={25}
                collapsible
                collapsedSize={0}
                onCollapse={() => setSidebarCollapsed(true)}
                onExpand={() => setSidebarCollapsed(false)}
                onResize={handleSidebarResize}
                className={`flex min-w-0 flex-col overflow-hidden ${
                  sidebarCollapsed ? 'max-w-0' : 'min-w-[180px] max-w-[400px]'
                }`}
              >
                <Sidebar />
              </ResizablePanel>

              {!sidebarCollapsed && <ResizableHandle />}

              <ResizablePanel
                defaultSize={85}
                minSize={50}
                className="flex min-w-0 flex-col overflow-hidden"
              >
                <div className="flex h-full flex-1 flex-col overflow-hidden border-l border-border/40 bg-background">
                  <div
                    ref={setChatMainHost}
                    className={isChatView ? 'min-h-0 flex-1 min-w-0 overflow-hidden' : 'hidden'}
                  />

                  <div ref={setChatParkingHost} className="hidden" />

                  {shouldMountWorkspaceMain && (
                    <div
                      className={
                        isWorkspaceView ? 'min-h-0 flex-1 min-w-0 overflow-hidden' : 'hidden'
                      }
                    >
                      <ResizablePanelGroup
                        direction="horizontal"
                        autoSaveId="desktop-workspace-workspace-panels"
                        className="flex h-full w-full"
                      >
                        <ResizablePanel defaultSize={72} minSize={30} className="min-w-0">
                          <EditorPanel />
                        </ResizablePanel>

                        <ResizableHandle />

                        <ResizablePanel
                          ref={workspaceChatPanelRef}
                          defaultSize={28}
                          minSize={0}
                          maxSize={70}
                          collapsible
                          collapsedSize={0}
                          onCollapse={() => setChatCollapsed(true)}
                          onExpand={() => setChatCollapsed(false)}
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

                  {shouldMountSitesMain && (
                    <div
                      className={isSitesView ? 'min-h-0 flex-1 min-w-0 overflow-hidden' : 'hidden'}
                    >
                      <SitesPage />
                    </div>
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>

            <ChatPanePortal
              destination={destination}
              agentSub={agentSub}
              fallback={chatFallback}
              mainHost={chatMainHost}
              panelHost={chatPanelHost}
              parkingHost={chatParkingHost}
              activeFilePath={activePath}
              activeFileContent={activeDoc?.content ?? null}
              vaultPath={vault?.path ?? null}
              chatCollapsed={chatCollapsed}
              onToggleCollapse={toggleChatPanel}
              onOpenSettings={openSettings}
              onReady={handleChatReady}
            />
          </div>
        </div>

        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} actions={commandActions} />
        <InputDialog
          open={inputDialogState.open}
          title={inputDialogState.title}
          description={inputDialogState.description}
          defaultValue={inputDialogState.defaultValue}
          placeholder={inputDialogState.placeholder}
          onConfirm={confirmInputDialog}
          onCancel={cancelInputDialog}
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
      </WorkspaceShellProvider>
    );
  };

  const renderVaultWelcomeState = () => <VaultOnboarding />;

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
          <header className="window-drag-region h-10 shrink-0" />
          <div className="flex flex-1 overflow-hidden">{renderVaultWelcomeState()}</div>
        </>
      )}
    </div>
  );
};
