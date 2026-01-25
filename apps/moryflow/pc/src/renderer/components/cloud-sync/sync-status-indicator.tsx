/**
 * [PROPS]: vaultPath, onOpenSettings, compact
 * [EMITS]: onOpenSettings? - 点击时触发
 * [POS]: 云同步状态指示器（顶部/列表状态展示）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useCallback, useMemo } from 'react';
import { AlertCircleIcon, CloudIcon, Loading03Icon } from '@hugeicons/core-free-icons';
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
import type { HugeIcon } from '@anyhunt/ui/components/icon';

type StatusConfig = {
  icon: HugeIcon;
  label: string;
  description: string;
  className: string;
  animate?: boolean;
};

type DisplayStatusKey = 'synced' | 'syncing' | 'needsAttention';

const getStatusConfig = (t: any): Record<DisplayStatusKey, StatusConfig> => ({
  synced: {
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
  needsAttention: {
    icon: AlertCircleIcon,
    label: t('needsAttention'),
    description: t('syncPausedDescription'),
    className: 'text-amber-500',
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
  const { status, binding } = useCloudSync(vaultPath);

  const isSyncing = status?.engineStatus === 'syncing';
  const needsAttention =
    !binding ||
    status?.engineStatus === 'offline' ||
    status?.engineStatus === 'disabled' ||
    !!status?.error;

  // 计算显示状态
  const displayStatus = useMemo((): StatusConfig => {
    if (isSyncing) return STATUS_CONFIG.syncing;
    if (needsAttention) return STATUS_CONFIG.needsAttention;
    return STATUS_CONFIG.synced;
  }, [STATUS_CONFIG, isSyncing, needsAttention]);

  // 处理点击（仅打开设置）
  const handleClick = useCallback(() => {
    onOpenSettings?.();
  }, [onOpenSettings]);

  const statusIcon = displayStatus.icon;

  // 构建完整描述
  const tooltipContent = useMemo(() => {
    const lines: string[] = [displayStatus.description];
    if (status?.lastSyncAt) {
      const lastSync = new Date(status.lastSyncAt);
      lines.push(`${t('lastSync')}: ${lastSync.toLocaleTimeString()}`);
    } else {
      lines.push(`${t('lastSync')}: ${t('neverSynced')}`);
    }
    return lines;
  }, [displayStatus.description, status?.lastSyncAt, t]);

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
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-xs">
          <div className="space-y-1">
            {tooltipContent.map((line, i) => (
              <p key={i} className={i === 0 ? 'font-medium' : 'text-muted-foreground'}>
                {line}
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
