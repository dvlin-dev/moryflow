/**
 * [INPUT]: workspace/controller contexts + shell UI state（panel refs）
 * [OUTPUT]: Navigation-aware Workspace Shell（Sidebar + Main + Panels）
 * [POS]: DesktopWorkspaceShell - 桌面工作区主视图壳层（负责布局装配与 overlays，不承载业务状态）
 * [UPDATE]: 2026-02-11 - 侧边栏最小宽度调整为 260px；默认宽度=最小宽度，后续沿用 react-resizable-panels 的持久化宽度
 * [UPDATE]: 2026-02-11 - panel 百分比约束按容器宽度动态换算，确保拖拽下限与像素约束一致
 * [UPDATE]: 2026-02-26 - 壳层拆分为 layout-state/main-content/overlays 三层，主区状态统一 renderContentByState 分发
 * [UPDATE]: 2026-02-26 - main-content/overlays 切换到 workspace-shell-view-store 取数，移除装配层 props 平铺
 * [UPDATE]: 2026-03-03 - 删除 VaultOnboarding 启动页分支，改为 hydration skeleton + 无 workspace 顶部提示
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@moryflow/ui/components/alert';
import { Skeleton } from '@moryflow/ui/components/skeleton';
import { type SettingsSection } from '@/components/settings-dialog/const';
import { useTranslation } from '@/lib/i18n';
import { UnifiedTopBar } from './components/unified-top-bar';
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

export const DesktopWorkspaceShell = () => {
  const { t } = useTranslation('workspace');
  const markOnce = usePerfMarker();
  const hasInteracted = useFirstInteraction({ markOnce });
  const handleChatReady = useCallback(() => {
    markOnce('chat:ready');
  }, [markOnce]);

  const { destination, sidebarMode, setSidebarMode } = useWorkspaceNav();
  const { vault, isVaultHydrating, vaultMessage } = useWorkspaceVault();
  const { tree, treeState } = useWorkspaceTree();
  const { selectedFile, activeDoc, docState } = useWorkspaceDoc();
  const { commandOpen, setCommandOpen } = useWorkspaceCommand();
  const { inputDialogState, confirmInputDialog, cancelInputDialog } = useWorkspaceDialog();
  const effectiveTreeState = isVaultHydrating ? 'loading' : treeState;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection | undefined>(undefined);
  const openSettings = useCallback((section?: SettingsSection) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  }, []);

  const layoutState = useShellLayoutState({
    workspaceMainMounted: destination === 'agent' && sidebarMode === 'home',
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
    treeState: effectiveTreeState,
    treeLength: tree.length,
    activeDoc,
    docState,
    markOnce,
  });

  useWorkspaceWarmup({
    enabled: Boolean(vault) && effectiveTreeState === 'idle',
    hasInteracted,
  });

  useEffect(() => {
    if (isVaultHydrating || vault) {
      return;
    }
    if (destination !== 'agent' || sidebarMode !== 'home') {
      setSidebarMode('home');
    }
  }, [destination, isVaultHydrating, setSidebarMode, sidebarMode, vault]);

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

  useSyncWorkspaceShellViewStore({
    destination,
    sidebarMode,
    vaultPath: vault?.path ?? '',
    treeState: effectiveTreeState,
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
    inputDialogState,
    onInputDialogConfirm: confirmInputDialog,
    onInputDialogCancel: cancelInputDialog,
    settingsOpen,
    settingsSection,
    onSettingsOpenChange: setSettingsOpen,
  });

  return (
    <div
      className="flex h-screen w-screen flex-col bg-muted/30 text-foreground"
      data-testid="workspace-shell"
    >
      <WorkspaceShellProvider value={shellController}>
        <div className="flex h-full w-full flex-col overflow-hidden">
          <UnifiedTopBar />
          {!isVaultHydrating && !vault && vaultMessage ? (
            <div className="px-4 pt-2" data-testid="workspace-no-vault-hint">
              <Alert>
                <AlertDescription>{t(vaultMessage)}</AlertDescription>
              </Alert>
            </div>
          ) : null}
          <WorkspaceShellMainContent />
          <WorkspaceShellOverlays />
        </div>
      </WorkspaceShellProvider>
    </div>
  );
};
