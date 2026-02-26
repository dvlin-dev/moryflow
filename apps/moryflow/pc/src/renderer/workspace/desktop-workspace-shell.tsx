/**
 * [INPUT]: workspace/controller contexts + shell UI state（panel refs）
 * [OUTPUT]: Navigation-aware Workspace Shell（Sidebar + Main + Panels）
 * [POS]: DesktopWorkspaceShell - 桌面工作区主视图壳层（负责布局装配与 overlays，不承载业务状态）
 * [UPDATE]: 2026-02-11 - 侧边栏最小宽度调整为 260px；默认宽度=最小宽度，后续沿用 react-resizable-panels 的持久化宽度
 * [UPDATE]: 2026-02-11 - panel 百分比约束按容器宽度动态换算，确保拖拽下限与像素约束一致
 * [UPDATE]: 2026-02-26 - 壳层拆分为 layout-state/main-content/overlays 三层，主区状态统一 renderContentByState 分发
 * [UPDATE]: 2026-02-26 - main-content/overlays 切换到 workspace-shell-view-store 取数，移除装配层 props 平铺
 */

import { useCallback, useMemo, useState } from 'react';
import { Skeleton } from '@moryflow/ui/components/skeleton';
import { type SettingsSection } from '@/components/settings-dialog/const';
import { UnifiedTopBar } from './components/unified-top-bar';
import { VaultOnboarding } from './components/vault-onboarding';
import {
  usePerfMarker,
  useFirstInteraction,
  useStartupPerfMarks,
  useWorkspaceWarmup,
} from './hooks/use-startup-perf';
import { useShellLayoutState } from './hooks/use-shell-layout-state';
import { WorkspaceShellMainContent } from './components/workspace-shell-main-content';
import { WorkspaceShellOverlays } from './components/workspace-shell-overlays';
import { useSyncWorkspaceShellViewStore } from './stores/workspace-shell-view-store';
import {
  WorkspaceShellProvider,
  useWorkspaceCommand,
  useWorkspaceDialog,
  useWorkspaceDoc,
  useWorkspaceNav,
  useWorkspaceTree,
  useWorkspaceVault,
} from './context';

type VaultShellState = 'without-vault' | 'with-vault';

export const DesktopWorkspaceShell = () => {
  const markOnce = usePerfMarker();
  const hasInteracted = useFirstInteraction({ markOnce });
  const handleChatReady = useCallback(() => {
    markOnce('chat:ready');
  }, [markOnce]);

  const { destination, agentSub } = useWorkspaceNav();
  const { vault } = useWorkspaceVault();
  const { tree, treeState } = useWorkspaceTree();
  const { selectedFile, activeDoc, docState } = useWorkspaceDoc();
  const { commandOpen, setCommandOpen, commandActions } = useWorkspaceCommand();
  const { inputDialogState, confirmInputDialog, cancelInputDialog } = useWorkspaceDialog();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection | undefined>(undefined);
  const openSettings = useCallback((section?: SettingsSection) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  }, []);

  const layoutState = useShellLayoutState({
    workspaceMainMounted: destination === 'agent' && agentSub === 'workspace',
  });

  const shellController = useMemo(
    () => ({
      sidebarCollapsed: layoutState.sidebarCollapsed,
      sidebarWidth: layoutState.sidebarWidth,
      toggleSidebarPanel: layoutState.toggleSidebarPanel,
      chatCollapsed: layoutState.chatCollapsed,
      toggleChatPanel: layoutState.toggleChatPanel,
      openSettings,
    }),
    [layoutState, openSettings]
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

  const startupSkeleton = useMemo(
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

  const shellState: VaultShellState = vault ? 'with-vault' : 'without-vault';
  useSyncWorkspaceShellViewStore({
    destination,
    agentSub,
    vaultPath: vault?.path ?? '',
    treeState,
    treeLength: tree.length,
    selectedFile,
    activeDoc,
    chatFallback,
    startupSkeleton,
    layoutState,
    onToggleChatPanel: layoutState.toggleChatPanel,
    onOpenSettings: openSettings,
    onChatReady: handleChatReady,
    commandOpen,
    onCommandOpenChange: setCommandOpen,
    commandActions,
    inputDialogState,
    onInputDialogConfirm: confirmInputDialog,
    onInputDialogCancel: cancelInputDialog,
    settingsOpen,
    settingsSection,
    onSettingsOpenChange: setSettingsOpen,
  });

  const renderContentByState = () => {
    if (shellState === 'without-vault') {
      return (
        <>
          <header className="window-drag-region h-10 shrink-0" />
          <div className="flex flex-1 overflow-hidden">
            <VaultOnboarding />
          </div>
        </>
      );
    }

    return (
      <WorkspaceShellProvider value={shellController}>
        <div className="flex h-full w-full flex-col overflow-hidden">
          <UnifiedTopBar />
          <WorkspaceShellMainContent />
          <WorkspaceShellOverlays />
        </div>
      </WorkspaceShellProvider>
    );
  };

  return (
    <div
      className="flex h-screen w-screen flex-col bg-muted/30 text-foreground"
      data-testid="workspace-shell"
    >
      {renderContentByState()}
    </div>
  );
};
