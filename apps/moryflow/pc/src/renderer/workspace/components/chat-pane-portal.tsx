/**
 * [PROPS]: ChatPanePortalProps
 * [EMITS]: -
 * [POS]: Single ChatPane instance rendered via Portal:
 *        destination=agent + agentSub=chat      -> main panel
 *        destination=agent + agentSub=workspace -> right assistant panel
 *        destination=sites                      -> hidden parking host (keeps state, no layout impact)
 * [UPDATE]: 2026-02-08 - 修复 Portal 渲染目标：render into stable portalRoot（避免 Host 下出现额外占位 sibling 导致 Chat/Sites 初始错位与切换 remount 卡顿）
 * [UPDATE]: 2026-02-10 - portalRoot 初始化改为 useState lazy initializer（避免 render 阶段写 ref 的副作用形式）
 */

import { useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { SettingsSection } from '@/components/settings-dialog/const';
import type { AgentSub, Destination } from '@/workspace/navigation/state';
import { ChatPaneWrapper } from './chat-pane-wrapper';

type ChatPanePortalProps = {
  destination: Destination;
  agentSub: AgentSub;
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
  destination,
  agentSub,
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
  const desiredHost =
    destination === 'agent' ? (agentSub === 'chat' ? mainHost : panelHost) : parkingHost;
  const fallbackHost = parkingHost ?? mainHost ?? panelHost;
  const host = desiredHost ?? fallbackHost;

  // Keep a stable portal container to avoid remounting ChatPane when we move it between hosts.
  // We only re-parent this DOM node, preserving React component state.
  const [portalRoot] = useState<HTMLDivElement | null>(() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div');
    // The portal root is the ONLY layout-affecting child under the host. We render into it.
    // Keeping it as a simple block container avoids flex-row "sibling" layout issues.
    el.className = 'min-h-0 h-full w-full min-w-0 overflow-hidden';
    return el;
  });

  useLayoutEffect(() => {
    if (!portalRoot || !host) return;

    if (portalRoot.parentElement !== host) {
      host.appendChild(portalRoot);
    }
  }, [host, portalRoot]);

  useLayoutEffect(() => {
    return () => {
      portalRoot?.remove();
    };
  }, [portalRoot]);

  if (!portalRoot || !host) return null;

  return createPortal(
    <ChatPaneWrapper
      fallback={fallback}
      variant={destination === 'agent' && agentSub === 'workspace' ? 'panel' : 'mode'}
      activeFilePath={destination === 'agent' && agentSub === 'workspace' ? activeFilePath : null}
      activeFileContent={
        destination === 'agent' && agentSub === 'workspace' ? activeFileContent : null
      }
      vaultPath={vaultPath}
      onReady={onReady}
      collapsed={destination === 'agent' && agentSub === 'workspace' ? chatCollapsed : false}
      onToggleCollapse={
        destination === 'agent' && agentSub === 'workspace' ? onToggleCollapse : undefined
      }
      onOpenSettings={onOpenSettings}
    />,
    portalRoot
  );
};
