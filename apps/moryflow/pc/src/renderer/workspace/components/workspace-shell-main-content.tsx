/**
 * [PROPS]: 无（通过 workspace-shell-view-store selector 取数）
 * [EMITS]: onToggleChatPanel(), onOpenSettings(section), onChatReady()
 * [POS]: DesktopWorkspaceShell 主内容渲染层（destination 分发 + panel 装配 + ChatPane portal host）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useEffect, useState } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@moryflow/ui/components/resizable';
import { ChatPaneRuntimeProvider } from '@/components/chat-pane/context/chat-pane-runtime-context';
import type { DocumentSurface, HomeCanvasRequest } from '../const';
import type { SidebarMode, Destination } from '../navigation/state';
import { resolveWorkspaceLayout, type MainViewState } from '../navigation/layout-resolver';
import { getModulesRegistryItems, type ModuleMainViewState } from '../navigation/modules-registry';
import { SIDEBAR_MIN_WIDTH } from './unified-top-bar';
import { Sidebar } from './sidebar';
import { SitesPage } from './sites';
import { SkillsPage } from './skills';
import { RemoteAgentsPage } from './remote-agents';
import { EditorPanel } from './editor-panel';
import { ChatPanePortal } from './chat-pane-portal';
import { WorkspaceNewThreadSurface } from './workspace-new-thread-surface';
import { useWorkspaceShellViewStore } from '../stores/workspace-shell-view-store';
import { useWorkspaceNav, useWorkspaceShell } from '../context';

type VaultContentState = 'startup-loading' | 'ready';
const MODULE_REGISTRY_ITEMS = getModulesRegistryItems();
const MAIN_KEEP_ALIVE_KEYS = [
  'agent-home',
  ...MODULE_REGISTRY_ITEMS.map((item) => item.mainViewState),
] as const;

export type MainKeepAliveViewKey = (typeof MAIN_KEEP_ALIVE_KEYS)[number];
export type MainViewKeepAliveMap = Record<MainKeepAliveViewKey, boolean>;

const MAIN_KEEP_ALIVE_KEY_SET = new Set<MainViewState>(MAIN_KEEP_ALIVE_KEYS);
const isMainKeepAliveViewKey = (
  mainViewState: MainViewState
): mainViewState is MainKeepAliveViewKey => MAIN_KEEP_ALIVE_KEY_SET.has(mainViewState);

const createEmptyMainViewKeepAliveMap = (): MainViewKeepAliveMap => ({
  'agent-home': false,
  'remote-agents': false,
  skills: false,
  sites: false,
});

export const createInitialMainViewKeepAliveMap = (
  mainViewState: MainViewState
): MainViewKeepAliveMap => {
  const keepAliveMap = createEmptyMainViewKeepAliveMap();
  if (isMainKeepAliveViewKey(mainViewState)) {
    keepAliveMap[mainViewState] = true;
  }
  return keepAliveMap;
};

export const markMainViewMounted = (
  keepAliveMap: MainViewKeepAliveMap,
  mainViewState: MainViewState
): MainViewKeepAliveMap => {
  if (!isMainKeepAliveViewKey(mainViewState)) {
    return keepAliveMap;
  }
  if (keepAliveMap[mainViewState]) {
    return keepAliveMap;
  }
  return {
    ...keepAliveMap,
    [mainViewState]: true,
  };
};

export const resolveMainViewState = (
  destination: Destination,
  sidebarMode: SidebarMode
): MainViewState => resolveWorkspaceLayout({ destination, sidebarMode }).mainViewState;

export type HomeMainSurface = 'default' | 'editor-split' | 'entry-canvas';

export const resolveHomeMainSurface = (
  destination: Destination,
  sidebarMode: SidebarMode,
  documentSurface: DocumentSurface,
  homeCanvasRequest: HomeCanvasRequest | null,
  activePath: string | null
): HomeMainSurface => {
  if (destination !== 'agent' || sidebarMode !== 'home') {
    return 'default';
  }
  if (documentSurface === 'empty') {
    return 'entry-canvas';
  }
  if (homeCanvasRequest && homeCanvasRequest.activePathAtRequest === activePath) {
    return 'entry-canvas';
  }
  return 'editor-split';
};

const getMainViewClass = (visible: boolean) =>
  visible ? 'min-h-0 flex-1 min-w-0 overflow-hidden' : 'hidden';

export const WorkspaceShellMainContent = () => {
  const { setSidebarMode } = useWorkspaceNav();
  const { clearHomeCanvas } = useWorkspaceShell();
  const destination = useWorkspaceShellViewStore((state) => state.destination);
  const sidebarMode = useWorkspaceShellViewStore((state) => state.sidebarMode);
  const vaultPath = useWorkspaceShellViewStore((state) => state.vaultPath);
  const treeState = useWorkspaceShellViewStore((state) => state.treeState);
  const treeLength = useWorkspaceShellViewStore((state) => state.treeLength);
  const selectedFile = useWorkspaceShellViewStore((state) => state.selectedFile);
  const activeDoc = useWorkspaceShellViewStore((state) => state.activeDoc);
  const documentSurface = useWorkspaceShellViewStore((state) => state.documentSurface);
  const homeCanvasRequest = useWorkspaceShellViewStore((state) => state.homeCanvasRequest);
  const chatFallback = useWorkspaceShellViewStore((state) => state.chatFallback);
  const startupSkeleton = useWorkspaceShellViewStore((state) => state.startupSkeleton);
  const onToggleChatPanel = useWorkspaceShellViewStore((state) => state.onToggleChatPanel);
  const onOpenSettings = useWorkspaceShellViewStore((state) => state.onOpenSettings);
  const onChatReady = useWorkspaceShellViewStore((state) => state.onChatReady);
  const sidebarPanelRef = useWorkspaceShellViewStore((state) => state.layoutState.sidebarPanelRef);
  const workspaceChatPanelRef = useWorkspaceShellViewStore(
    (state) => state.layoutState.workspaceChatPanelRef
  );
  const panelGroupRef = useWorkspaceShellViewStore((state) => state.layoutState.panelGroupRef);
  const sidebarCollapsed = useWorkspaceShellViewStore(
    (state) => state.layoutState.sidebarCollapsed
  );
  const chatCollapsed = useWorkspaceShellViewStore((state) => state.layoutState.chatCollapsed);
  const onSidebarCollapse = useWorkspaceShellViewStore(
    (state) => state.layoutState.onSidebarCollapse
  );
  const onSidebarExpand = useWorkspaceShellViewStore((state) => state.layoutState.onSidebarExpand);
  const onChatCollapse = useWorkspaceShellViewStore((state) => state.layoutState.onChatCollapse);
  const onChatExpand = useWorkspaceShellViewStore((state) => state.layoutState.onChatExpand);
  const handleSidebarResize = useWorkspaceShellViewStore(
    (state) => state.layoutState.handleSidebarResize
  );
  const sidebarDefaultSizePercent = useWorkspaceShellViewStore(
    (state) => state.layoutState.sidebarDefaultSizePercent
  );
  const sidebarMinSizePercent = useWorkspaceShellViewStore(
    (state) => state.layoutState.sidebarMinSizePercent
  );
  const sidebarMaxSizePercent = useWorkspaceShellViewStore(
    (state) => state.layoutState.sidebarMaxSizePercent
  );
  const mainMinSizePercent = useWorkspaceShellViewStore(
    (state) => state.layoutState.mainMinSizePercent
  );

  const mainViewState = resolveMainViewState(destination, sidebarMode);
  const [mainViewKeepAliveMap, setMainViewKeepAliveMap] = useState(() =>
    createInitialMainViewKeepAliveMap(mainViewState)
  );

  const [chatMainHost, setChatMainHost] = useState<HTMLElement | null>(null);
  const [chatPanelHost, setChatPanelHost] = useState<HTMLElement | null>(null);
  const [chatParkingHost, setChatParkingHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMainViewKeepAliveMap((prev) => markMainViewMounted(prev, mainViewState));
  }, [mainViewState]);

  const vaultContentState: VaultContentState =
    treeState === 'loading' && treeLength === 0 ? 'startup-loading' : 'ready';

  const shouldMountMainView = (viewState: MainKeepAliveViewKey): boolean =>
    mainViewKeepAliveMap[viewState] || mainViewState === viewState;
  const shouldMountHomeMain = shouldMountMainView('agent-home');
  const shouldMountModuleMain = (viewState: ModuleMainViewState): boolean => {
    return shouldMountMainView(viewState);
  };
  const renderModuleMain = (viewState: ModuleMainViewState) => {
    if (viewState === 'remote-agents') return <RemoteAgentsPage />;
    if (viewState === 'skills') return <SkillsPage />;
    return <SitesPage />;
  };
  const activePath = activeDoc?.path ?? selectedFile?.path ?? null;
  const homeMainSurface = resolveHomeMainSurface(
    destination,
    sidebarMode,
    documentSurface,
    homeCanvasRequest,
    activePath
  );
  const shouldShowHomeEntryCanvas = homeMainSurface === 'entry-canvas';
  const handlePreThreadConversationStart = () => {
    clearHomeCanvas();
    setSidebarMode('chat');
  };

  const renderContentByState = () => {
    if (vaultContentState === 'startup-loading') {
      return startupSkeleton;
    }

    return (
      <ChatPaneRuntimeProvider
        activeFilePath={activePath}
        activeFileContent={activeDoc?.content ?? null}
        vaultPath={vaultPath}
        onOpenSettings={onOpenSettings}
        onPreThreadConversationStart={handlePreThreadConversationStart}
      >
        <div ref={panelGroupRef} className="flex flex-1 overflow-hidden">
          <ResizablePanelGroup
            direction="horizontal"
            autoSaveId="desktop-workspace-shell-panels"
            className="flex h-full w-full"
          >
            <ResizablePanel
              ref={sidebarPanelRef}
              defaultSize={sidebarDefaultSizePercent}
              minSize={sidebarMinSizePercent}
              maxSize={sidebarMaxSizePercent}
              collapsible
              collapsedSize={0}
              onCollapse={onSidebarCollapse}
              onExpand={onSidebarExpand}
              onResize={handleSidebarResize}
              className={`flex min-w-0 flex-col overflow-hidden ${
                sidebarCollapsed ? 'max-w-0' : 'max-w-[780px]'
              }`}
              style={sidebarCollapsed ? undefined : { minWidth: `${SIDEBAR_MIN_WIDTH}px` }}
            >
              <Sidebar />
            </ResizablePanel>

            {!sidebarCollapsed && <ResizableHandle />}

            <ResizablePanel
              defaultSize={100 - sidebarDefaultSizePercent}
              minSize={mainMinSizePercent}
              className="flex min-w-0 flex-col overflow-hidden"
            >
              <div className="flex h-full flex-1 flex-col overflow-hidden border-l border-border/40 bg-background">
                <div
                  ref={setChatMainHost}
                  className={getMainViewClass(mainViewState === 'agent-chat')}
                />

                <div ref={setChatParkingHost} className="hidden" />

                {shouldShowHomeEntryCanvas && (
                  <div className={getMainViewClass(true)}>
                    <WorkspaceNewThreadSurface />
                  </div>
                )}

                {shouldMountHomeMain && (
                  <div
                    className={getMainViewClass(
                      mainViewState === 'agent-home' && homeMainSurface === 'editor-split'
                    )}
                  >
                    <ResizablePanelGroup
                      direction="horizontal"
                      autoSaveId="desktop-workspace-home-panels"
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
                        onCollapse={onChatCollapse}
                        onExpand={onChatExpand}
                        className="flex flex-col overflow-hidden min-w-[410px] data-[panel-size=0.0]:min-w-0"
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

                {MODULE_REGISTRY_ITEMS.map(
                  ({ destination: moduleDestination, mainViewState: viewState }) => {
                    if (!shouldMountModuleMain(viewState)) return null;
                    return (
                      <div
                        key={moduleDestination}
                        className={getMainViewClass(mainViewState === viewState)}
                      >
                        {renderModuleMain(viewState)}
                      </div>
                    );
                  }
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          <ChatPanePortal
            destination={destination}
            sidebarMode={sidebarMode}
            fallback={chatFallback}
            mainHost={chatMainHost}
            panelHost={chatPanelHost}
            parkingHost={chatParkingHost}
            activeFilePath={activePath}
            activeFileContent={activeDoc?.content ?? null}
            vaultPath={vaultPath}
            chatCollapsed={chatCollapsed}
            onToggleCollapse={onToggleChatPanel}
            onOpenSettings={onOpenSettings}
            onReady={onChatReady}
            onPreThreadConversationStart={handlePreThreadConversationStart}
            forcePlacement={shouldShowHomeEntryCanvas ? 'parking' : undefined}
          />
        </div>
      </ChatPaneRuntimeProvider>
    );
  };

  return <>{renderContentByState()}</>;
};
