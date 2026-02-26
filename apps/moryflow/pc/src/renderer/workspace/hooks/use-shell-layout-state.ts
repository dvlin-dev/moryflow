/**
 * [PROVIDES]: useShellLayoutState - Workspace Shell 面板布局状态机
 * [DEPENDS]: ResizablePanel imperative handles
 * [POS]: DesktopWorkspaceShell 的布局层状态（sidebar/chat 折叠、宽度同步、拖拽约束）
 * [UPDATE]: 2026-02-26 - 返回值改为 useMemo，稳定 layoutState 引用，避免 shell view store 快照误判变化
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ImperativePanelHandle } from '@moryflow/ui/components/resizable';
import { SIDEBAR_MIN_WIDTH } from '../components/unified-top-bar';

type UseShellLayoutStateOptions = {
  workspaceMainMounted: boolean;
};

export type ShellLayoutState = {
  sidebarPanelRef: RefObject<ImperativePanelHandle | null>;
  workspaceChatPanelRef: RefObject<ImperativePanelHandle | null>;
  panelGroupRef: RefObject<HTMLDivElement | null>;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  chatCollapsed: boolean;
  toggleSidebarPanel: () => void;
  toggleChatPanel: () => void;
  onSidebarCollapse: () => void;
  onSidebarExpand: () => void;
  onChatCollapse: () => void;
  onChatExpand: () => void;
  handleSidebarResize: (size: number) => void;
  sidebarDefaultSizePercent: number;
  sidebarMinSizePercent: number;
  sidebarMaxSizePercent: number;
  mainMinSizePercent: number;
};

export const useShellLayoutState = ({
  workspaceMainMounted,
}: UseShellLayoutStateOptions): ShellLayoutState => {
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const workspaceChatPanelRef = useRef<ImperativePanelHandle>(null);
  const panelGroupRef = useRef<HTMLDivElement>(null);
  const sidebarSizePercentRef = useRef<number>(15);
  const [panelGroupWidth, setPanelGroupWidth] = useState(0);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_MIN_WIDTH);

  const getPanelGroupWidth = useCallback(() => panelGroupRef.current?.offsetWidth ?? 0, []);

  const updateSidebarWidthFromPercent = useCallback(
    (sizePercent: number) => {
      const containerWidth = getPanelGroupWidth();
      setPanelGroupWidth((prev) => (prev === containerWidth ? prev : containerWidth));
      if (!containerWidth) return;
      const pixelWidth = (sizePercent / 100) * containerWidth;
      setSidebarWidth((prev) => (Math.abs(prev - pixelWidth) < 0.5 ? prev : pixelWidth));
    },
    [getPanelGroupWidth]
  );

  const sidebarMinSizePercent = useMemo(() => {
    if (!panelGroupWidth) return 10;
    return Math.min(90, Math.max(10, (SIDEBAR_MIN_WIDTH / panelGroupWidth) * 100));
  }, [panelGroupWidth]);

  const sidebarMaxSizePercent = useMemo(
    () => Math.min(95, Math.max(sidebarMinSizePercent + 15, 65)),
    [sidebarMinSizePercent]
  );

  const sidebarDefaultSizePercent = sidebarMinSizePercent;
  const mainMinSizePercent = useMemo(
    () => Math.max(5, 100 - sidebarMaxSizePercent),
    [sidebarMaxSizePercent]
  );

  const syncPanelGroupWidth = useCallback(() => {
    const nextWidth = getPanelGroupWidth();
    setPanelGroupWidth((prev) => (prev === nextWidth ? prev : nextWidth));
  }, [getPanelGroupWidth]);

  const syncSidebarStateFromPanel = useCallback(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;

    const isCollapsed = panel.isCollapsed();
    setSidebarCollapsed((prev) => (prev === isCollapsed ? prev : isCollapsed));

    const sizePercent = panel.getSize();
    sidebarSizePercentRef.current = sizePercent;
    updateSidebarWidthFromPercent(sizePercent);
  }, [updateSidebarWidthFromPercent]);

  const handleSidebarResize = useCallback(
    (size: number) => {
      sidebarSizePercentRef.current = size;
      updateSidebarWidthFromPercent(size);
    },
    [updateSidebarWidthFromPercent]
  );

  // 首帧与恢复布局：同步 collapsed/width（避免重启后状态错位）
  useLayoutEffect(() => {
    syncPanelGroupWidth();
    syncSidebarStateFromPanel();
    const id = window.requestAnimationFrame(syncSidebarStateFromPanel);
    return () => window.cancelAnimationFrame(id);
  }, [syncPanelGroupWidth, syncSidebarStateFromPanel]);

  // 窗口/容器宽度变化时重算 sidebarWidth（percent 不变，px 会变）
  useEffect(() => {
    const el = panelGroupRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      syncPanelGroupWidth();
      const sizePercent = sidebarPanelRef.current?.getSize() ?? sidebarSizePercentRef.current;
      updateSidebarWidthFromPercent(sizePercent);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncPanelGroupWidth, updateSidebarWidthFromPercent]);

  const toggleChatPanel = useCallback(() => {
    const panel = workspaceChatPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
      setChatCollapsed(false);
      return;
    }
    panel.collapse();
    setChatCollapsed(true);
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

  const toggleSidebarPanel = useCallback(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
      setSidebarCollapsed(false);
      return;
    }
    panel.collapse();
    setSidebarCollapsed(true);
  }, []);

  const onSidebarCollapse = useCallback(() => setSidebarCollapsed(true), []);
  const onSidebarExpand = useCallback(() => setSidebarCollapsed(false), []);
  const onChatCollapse = useCallback(() => setChatCollapsed(true), []);
  const onChatExpand = useCallback(() => setChatCollapsed(false), []);

  return useMemo(
    () => ({
      sidebarPanelRef,
      workspaceChatPanelRef,
      panelGroupRef,
      sidebarCollapsed,
      sidebarWidth,
      chatCollapsed,
      toggleSidebarPanel,
      toggleChatPanel,
      onSidebarCollapse,
      onSidebarExpand,
      onChatCollapse,
      onChatExpand,
      handleSidebarResize,
      sidebarDefaultSizePercent,
      sidebarMinSizePercent,
      sidebarMaxSizePercent,
      mainMinSizePercent,
    }),
    [
      sidebarPanelRef,
      workspaceChatPanelRef,
      panelGroupRef,
      sidebarCollapsed,
      sidebarWidth,
      chatCollapsed,
      toggleSidebarPanel,
      toggleChatPanel,
      onSidebarCollapse,
      onSidebarExpand,
      onChatCollapse,
      onChatExpand,
      handleSidebarResize,
      sidebarDefaultSizePercent,
      sidebarMinSizePercent,
      sidebarMaxSizePercent,
      mainMinSizePercent,
    ]
  );
};
