/**
 * [PROPS]: ChatPaneWrapperProps
 * [EMITS]: onReady/onToggleCollapse/onOpenSettings
 * [POS]: ChatPane 的懒加载包装层（Suspense + React.lazy），仅负责加载与 props 透传
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Suspense, lazy, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { SettingsSection } from '@/components/settings-dialog/const';

type ChatPaneWrapperProps = {
  fallback: ReactNode;
  variant?: 'panel' | 'mode';
  activeFilePath?: string | null;
  activeFileContent?: string | null;
  vaultPath?: string | null;
  onReady?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenSettings?: (section?: SettingsSection) => void;
  onPreThreadConversationStart?: () => void;
};

const LazyChatPane = lazy(() =>
  import('@/components/chat-pane').then((mod) => ({
    default: mod.ChatPane,
  }))
);

export const ChatPaneWrapper = ({
  fallback,
  variant,
  activeFilePath,
  activeFileContent,
  vaultPath,
  onReady,
  collapsed,
  onToggleCollapse,
  onOpenSettings,
  onPreThreadConversationStart,
}: ChatPaneWrapperProps) => {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <Suspense fallback={fallback}>
      <LazyChatPane
        variant={variant}
        activeFilePath={activeFilePath ?? undefined}
        activeFileContent={activeFileContent ?? null}
        vaultPath={vaultPath ?? null}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onOpenSettings={onOpenSettings}
        onPreThreadConversationStart={onPreThreadConversationStart}
      />
    </Suspense>
  );
};
