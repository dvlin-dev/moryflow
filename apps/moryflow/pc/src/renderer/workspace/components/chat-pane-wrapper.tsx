/**
 * [PROPS]: ChatPaneWrapperProps
 * [EMITS]: onReady/onToggleCollapse/onOpenSettings
 * [POS]: ChatPane 的懒加载包装层（Suspense + React.lazy），仅负责加载与 props 透传
 * [UPDATE]: 2026-02-10 - 移除对 `streamdown` 的直接预加载（避免未声明直接依赖；预加载由 Workspace 统一的 preload service 负责）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
      />
    </Suspense>
  );
};
