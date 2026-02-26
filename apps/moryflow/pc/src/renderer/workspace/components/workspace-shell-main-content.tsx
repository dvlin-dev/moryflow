/**
 * [PROPS]: 无（通过 workspace-shell-view-store selector 取数）
 * [EMITS]: onToggleChatPanel(), onOpenSettings(section), onChatReady()
 * [POS]: DesktopWorkspaceShell 主内容渲染层（destination 分发 + panel 装配 + ChatPane portal host）
 * [UPDATE]: 2026-02-26 - 改为从 workspace-shell-view-store 就地取数，移除上层 props 平铺
 * [UPDATE]: 2026-02-26 - 移除对象字面量 selector，改为原子 selector，避免 zustand v5 快照引用抖动
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useState } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@moryflow/ui/components/resizable';
import type { AgentSub, Destination } from '../navigation/state';
import { SIDEBAR_MIN_WIDTH } from './unified-top-bar';
import { Sidebar } from './sidebar';
import { SitesPage } from './sites';
import { SkillsPage } from './skills';
import { EditorPanel } from './editor-panel';
import { ChatPanePortal } from './chat-pane-portal';
import { useWorkspaceShellViewStore } from '../stores/workspace-shell-view-store';

type MainViewState = 'agent-chat' | 'agent-workspace' | 'skills' | 'sites';
type VaultContentState = 'startup-loading' | 'ready';

const resolveMainViewState = (destination: Destination, agentSub: AgentSub): MainViewState => {
  if (destination === 'skills') return 'skills';
  if (destination === 'sites') return 'sites';
  return agentSub === 'workspace' ? 'agent-workspace' : 'agent-chat';
};

const getMainViewClass = (visible: boolean) =>
  visible ? 'min-h-0 flex-1 min-w-0 overflow-hidden' : 'hidden';

export const WorkspaceShellMainContent = () => {
  const destination = useWorkspaceShellViewStore((state) => state.destination);
  const agentSub = useWorkspaceShellViewStore((state) => state.agentSub);
  const vaultPath = useWorkspaceShellViewStore((state) => state.vaultPath);
  const treeState = useWorkspaceShellViewStore((state) => state.treeState);
  const treeLength = useWorkspaceShellViewStore((state) => state.treeLength);
  const selectedFile = useWorkspaceShellViewStore((state) => state.selectedFile);
  const activeDoc = useWorkspaceShellViewStore((state) => state.activeDoc);
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

  const [workspaceMainMounted, setWorkspaceMainMounted] = useState(agentSub === 'workspace');
  const [skillsMainMounted, setSkillsMainMounted] = useState(destination === 'skills');
  const [sitesMainMounted, setSitesMainMounted] = useState(destination === 'sites');

  const [chatMainHost, setChatMainHost] = useState<HTMLElement | null>(null);
  const [chatPanelHost, setChatPanelHost] = useState<HTMLElement | null>(null);
  const [chatParkingHost, setChatParkingHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (agentSub === 'workspace') {
      setWorkspaceMainMounted(true);
    }
    if (destination === 'skills') {
      setSkillsMainMounted(true);
    }
    if (destination === 'sites') {
      setSitesMainMounted(true);
    }
  }, [agentSub, destination]);

  const mainViewState = resolveMainViewState(destination, agentSub);
  const vaultContentState: VaultContentState =
    treeState === 'loading' && treeLength === 0 ? 'startup-loading' : 'ready';

  const shouldMountWorkspaceMain = workspaceMainMounted || mainViewState === 'agent-workspace';
  const shouldMountSkillsMain = skillsMainMounted || mainViewState === 'skills';
  const shouldMountSitesMain = sitesMainMounted || mainViewState === 'sites';
  const activePath = activeDoc?.path ?? selectedFile?.path ?? null;

  const renderContentByState = () => {
    if (vaultContentState === 'startup-loading') {
      return startupSkeleton;
    }

    return (
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

              {shouldMountWorkspaceMain && (
                <div className={getMainViewClass(mainViewState === 'agent-workspace')}>
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
                      onCollapse={onChatCollapse}
                      onExpand={onChatExpand}
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

              {shouldMountSkillsMain && (
                <div className={getMainViewClass(mainViewState === 'skills')}>
                  <SkillsPage />
                </div>
              )}

              {shouldMountSitesMain && (
                <div className={getMainViewClass(mainViewState === 'sites')}>
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
          vaultPath={vaultPath}
          chatCollapsed={chatCollapsed}
          onToggleCollapse={onToggleChatPanel}
          onOpenSettings={onOpenSettings}
          onReady={onChatReady}
        />
      </div>
    );
  };

  return <>{renderContentByState()}</>;
};
