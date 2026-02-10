/**
 * [PROPS]: ChatPanePortalProps
 * [EMITS]: -
 * [POS]: Single ChatPane instance rendered via Portal:
 *        Chat Mode -> main panel
 *        Workspace Mode -> right assistant panel
 *        Sites Mode -> hidden parking host (keeps state, no layout impact)
 * [UPDATE]: 2026-02-08 - 修复 Portal 渲染目标：render into stable portalRoot（避免 Host 下出现额外占位 sibling 导致 Chat/Sites 初始错位与切换 remount 卡顿）
 */

import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { SettingsSection } from '@/components/settings-dialog/const';
import type { AppMode } from '@/workspace/hooks/use-app-mode';
import { ChatPaneWrapper } from './chat-pane-wrapper';

type ChatPanePortalProps = {
  mode: AppMode;
  fallback: ReactNode;
  mainHost: HTMLElement | null;
  panelHost: HTMLElement | null;
  parkingHost: HTMLElement | null;
  activeFilePath: string | null;
  activeFileContent: string | null;
  vaultPath: string | null;
  chatCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings: (section?: SettingsSection) => void;
  onReady: () => void;
};

export const ChatPanePortal = ({
  mode,
  fallback,
  mainHost,
  panelHost,
  parkingHost,
  activeFilePath,
  activeFileContent,
  vaultPath,
  chatCollapsed,
  onToggleCollapse,
  onOpenSettings,
  onReady,
}: ChatPanePortalProps) => {
  const desiredHost = mode === 'chat' ? mainHost : mode === 'workspace' ? panelHost : parkingHost;
  const fallbackHost = parkingHost ?? mainHost ?? panelHost;
  const host = desiredHost ?? fallbackHost;
  const portalRootRef = useRef<HTMLDivElement | null>(null);

  // Keep a stable portal container to avoid remounting ChatPane when we move it between hosts.
  // We only re-parent this DOM node, preserving React component state.
  if (!portalRootRef.current && typeof document !== 'undefined') {
    const el = document.createElement('div');
    // The portal root is the ONLY layout-affecting child under the host. We render into it.
    // Keeping it as a simple block container avoids flex-row "sibling" layout issues.
    el.className = 'min-h-0 h-full w-full min-w-0 overflow-hidden';
    portalRootRef.current = el;
  }

  useLayoutEffect(() => {
    const portalRoot = portalRootRef.current;
    if (!portalRoot || !host) return;

    if (portalRoot.parentElement !== host) {
      host.appendChild(portalRoot);
    }
  }, [host]);

  useLayoutEffect(() => {
    return () => {
      portalRootRef.current?.remove();
    };
  }, []);

  const portalRoot = portalRootRef.current;
  if (!portalRoot || !host) return null;

  return createPortal(
    <ChatPaneWrapper
      fallback={fallback}
      variant={mode === 'workspace' ? 'panel' : 'mode'}
      activeFilePath={mode === 'workspace' ? activeFilePath : null}
      activeFileContent={mode === 'workspace' ? activeFileContent : null}
      vaultPath={vaultPath}
      onReady={onReady}
      collapsed={mode === 'workspace' ? chatCollapsed : false}
      onToggleCollapse={mode === 'workspace' ? onToggleCollapse : undefined}
      onOpenSettings={onOpenSettings}
    />,
    portalRoot
  );
};
