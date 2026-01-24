/**
 * 云同步状态指示器
 * 显示当前同步状态，点击可查看详情或触发同步
 */

import { useCallback, useMemo } from 'react';
import { AlertCircleIcon, CloudIcon, Loading03Icon, RefreshIcon } from '@hugeicons/core-free-icons';
import { Button } from '@anyhunt/ui/components/button';
import { Icon } from '@anyhunt/ui/components/icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@anyhunt/ui/components/tooltip';
import { useCloudSync } from '@/hooks/use-cloud-sync';
import { useTranslation } from '@/lib/i18n';
import type { SyncEngineStatus } from '@shared/ipc';
import type { HugeIcon } from '@anyhunt/ui/components/icon';

type StatusConfig = {
  icon: HugeIcon;
  label: string;
  description: string;
  className: string;
  animate?: boolean;
};

const getStatusConfig = (t: any): Record<SyncEngineStatus, StatusConfig> => ({
  idle: {
    icon: CloudIcon,
    label: t('synced'),
    description: t('allChangesSynced'),
    className: 'text-success',
  },
  syncing: {
    icon: Loading03Icon,
    label: t('syncing'),
    description: t('syncingChanges'),
    className: 'text-primary',
    animate: true,
  },
  offline: {
    icon: CloudIcon,
    label: t('offline'),
    description: t('networkUnavailable'),
    className: 'text-muted-foreground',
  },
  disabled: {
    icon: CloudIcon,
    label: t('notEnabled'),
    description: t('cloudSyncNotEnabled'),
    className: 'text-muted-foreground',
  },
});

type SyncStatusIndicatorProps = {
  vaultPath?: string | null;
  /** 点击打开设置 */
  onOpenSettings?: () => void;
  /** 简洁模式（只显示图标） */
  compact?: boolean;
};

export const SyncStatusIndicator = ({
  vaultPath,
  onOpenSettings,
  compact = false,
}: SyncStatusIndicatorProps) => {
  const { t } = useTranslation('workspace');
  const STATUS_CONFIG = useMemo(() => getStatusConfig(t), [t]);
  const { status, binding, triggerSync } = useCloudSync(vaultPath);

  // 计算显示状态
  const displayStatus = useMemo((): StatusConfig & { hasError: boolean } => {
    // 未绑定 vault 时显示为未启用
    if (!binding) {
      return { ...STATUS_CONFIG.disabled, hasError: false };
    }

    // 有错误时特殊显示
    if (status?.error) {
      return {
        icon: AlertCircleIcon,
        label: t('syncFailed'),
        description: status.error,
        className: 'text-destructive',
        hasError: true,
      };
    }

    const engineStatus = status?.engineStatus ?? 'disabled';
    return { ...STATUS_CONFIG[engineStatus], hasError: false };
  }, [status, binding, t, STATUS_CONFIG]);

  // 处理点击
  const handleClick = useCallback(() => {
    if (!binding && onOpenSettings) {
      // 未绑定时打开设置
      onOpenSettings();
      return;
    }

    if (displayStatus.hasError || status?.engineStatus === 'idle') {
      // 有错误或空闲时触发同步
      void triggerSync();
    }
  }, [binding, displayStatus.hasError, status?.engineStatus, triggerSync, onOpenSettings]);

  const statusIcon = displayStatus.icon;
  const pendingCount = status?.pendingCount ?? 0;

  // 构建完整描述
  const tooltipContent = useMemo(() => {
    const lines: string[] = [displayStatus.description];

    if (binding) {
      lines.push(`Vault: ${binding.vaultName}`);
    }

    if (pendingCount > 0) {
      lines.push(t('filesPending', { count: pendingCount }));
    }

    if (status?.lastSyncAt) {
      const lastSync = new Date(status.lastSyncAt);
      lines.push(`${t('lastSync')}: ${lastSync.toLocaleTimeString()}`);
    }

    return lines;
  }, [displayStatus.description, binding, pendingCount, status?.lastSyncAt, t]);

  // compact 模式：仅显示图标按钮，详情由 SyncStatusHoverCard 提供
  if (compact) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClick}>
        <Icon
          icon={statusIcon}
          className={`h-4 w-4 ${displayStatus.className} ${displayStatus.animate ? 'animate-spin' : ''}`}
        />
      </Button>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted/50"
            onClick={handleClick}
          >
            <Icon
              icon={statusIcon}
              className={`h-3.5 w-3.5 ${displayStatus.className} ${displayStatus.animate ? 'animate-spin' : ''}`}
            />
            <span className="text-muted-foreground">{displayStatus.label}</span>
            {pendingCount > 0 && (
              <span className="ml-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {pendingCount}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-xs">
          <div className="space-y-1">
            {tooltipContent.map((line, i) => (
              <p key={i} className={i === 0 ? 'font-medium' : 'text-muted-foreground'}>
                {line}
              </p>
            ))}
            {(displayStatus.hasError || status?.engineStatus === 'idle') && binding && (
              <p className="mt-1 flex items-center gap-1 text-primary">
                <Icon icon={RefreshIcon} className="h-3 w-3" />
                {t('clickToSync')}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
