/**
 * [PROPS]: { vault, onSettingsOpen }
 * [EMITS]: onSettingsOpen - 设置按钮点击事件
 * [POS]: 侧边栏工具区组件（仅图标，一行两个，含 E2E 选择器，Lucide 图标）
 * [UPDATE]: 2026-02-11 - 与侧边栏主内容统一横向 gutter（左右一致对齐）
 * [UPDATE]: 2026-02-11 - 外层容器横向 gutter 收敛（px-2.5 -> px-3.5）
 * [UPDATE]: 2026-02-11 - 横向 gutter 改为复用 sidebar 常量，保持与顶部/标题区一致
 */

import { Settings } from 'lucide-react';
import { SyncStatusIndicator, SyncStatusHoverCard } from '@/components/cloud-sync';
import { Tooltip, TooltipContent, TooltipTrigger } from '@anyhunt/ui/components/tooltip';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/server';
import { cn } from '@/lib/utils';
import type { SidebarToolsProps } from '../const';
import { SIDEBAR_GUTTER_X_CLASS } from '../const';

export const SidebarTools = ({ vault, onSettingsOpen }: SidebarToolsProps) => {
  const { t } = useTranslation('workspace');
  const { isAuthenticated } = useAuth();
  const vaultPath = vault?.path;

  return (
    <div
      className={cn('flex shrink-0 items-center justify-between py-1.5', SIDEBAR_GUTTER_X_CLASS)}
    >
      {/* 同步状态 - 左侧对齐基准线 */}
      {vaultPath && isAuthenticated ? (
        <SyncStatusHoverCard
          vaultPath={vaultPath}
          onOpenSettings={() => onSettingsOpen('cloud-sync')}
        >
          <div className="text-muted-foreground transition-colors hover:text-foreground">
            <SyncStatusIndicator vaultPath={vaultPath} compact />
          </div>
        </SyncStatusHoverCard>
      ) : (
        <div className="size-4" />
      )}

      {/* 设置 - 右侧 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onSettingsOpen('account')}
            data-testid="sidebar-settings-button"
          >
            <Settings className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{t('settingsLabel')}</TooltipContent>
      </Tooltip>
    </div>
  );
};
