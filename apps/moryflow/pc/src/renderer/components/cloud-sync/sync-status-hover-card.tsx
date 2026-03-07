/**
 * [PROPS]: children, vaultPath, onOpenSettings
 * [EMITS]: onOpenSettings? - 需要跳转设置时触发
 * [POS]: 云同步状态 HoverCard，展示摘要状态与单一操作入口（Lucide icons direct render）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useMemo, type ReactNode } from 'react';
import { CircleAlert, Cloud, Loader, type LucideIcon } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@moryflow/ui/components/hover-card';
import { Button } from '@moryflow/ui/components/button';
import { useCloudSync } from '@/hooks/use-cloud-sync';
import { useTranslation } from '@/lib/i18n';
import { resolveSyncStatusModel } from './sync-status-model';

type DisplayStatusKey = 'synced' | 'syncing' | 'needsAttention';

type StatusConfig = {
  icon: LucideIcon;
  title: string;
  description: string;
  colorClass: string;
  bgClass: string;
  animate?: boolean;
};

const getStatusConfig = (t: any): Record<DisplayStatusKey, StatusConfig> => ({
  synced: {
    icon: Cloud,
    title: t('synced'),
    description: t('allChangesSynced'),
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
  },
  syncing: {
    icon: Loader,
    title: t('syncing'),
    description: t('syncingChanges'),
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    animate: true,
  },
  needsAttention: {
    icon: CircleAlert,
    title: t('needsAttention'),
    description: t('syncPausedDescription'),
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
  },
});

const formatLastSyncTime = (timestamp: number | null, t: any): string => {
  if (!timestamp) return t('neverSynced');

  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return t('justNow');
  if (minutes < 60) return t('minutesAgo', { count: minutes });
  if (hours < 24) return t('hoursAgo', { count: hours });

  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return `${t('today')} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

type SyncStatusHoverCardProps = {
  children: ReactNode;
  vaultPath?: string | null;
  onOpenSettings?: () => void;
};

export const SyncStatusHoverCard = ({
  children,
  vaultPath,
  onOpenSettings,
}: SyncStatusHoverCardProps) => {
  const { t } = useTranslation('workspace');
  const STATUS_CONFIG = useMemo(() => getStatusConfig(t), [t]);
  const { status, binding, triggerSync } = useCloudSync(vaultPath);
  const model = resolveSyncStatusModel({
    hasBinding: Boolean(binding),
    isSyncing: status?.engineStatus === 'syncing',
    engineStatus: status?.engineStatus ?? 'disabled',
    hasError: Boolean(status?.error),
    notice: status?.notice ?? null,
  });
  const isSyncing = model.tone === 'syncing';
  const firstConflictItem = status?.notice?.items[0] ?? null;

  const displayStatus = useMemo((): StatusConfig => {
    if (model.tone === 'syncing') return STATUS_CONFIG.syncing;
    if (model.tone === 'needs-attention') return STATUS_CONFIG.needsAttention;
    return STATUS_CONFIG.synced;
  }, [STATUS_CONFIG, model.tone]);
  const StatusIcon = displayStatus.icon;

  const lastSyncLabel = useMemo(
    () => formatLastSyncTime(status?.lastSyncAt ?? null, t),
    [status?.lastSyncAt, t]
  );

  const title = model.calloutKind === 'conflict' ? t('conflictCopyReady') : displayStatus.title;
  const description =
    model.calloutKind === 'recovery'
      ? t('syncRecoveryDescription')
      : model.calloutKind === 'offline'
        ? t('syncOfflineDescription')
        : model.calloutKind === 'setup'
          ? t('syncSetupDescription')
          : model.calloutKind === 'conflict'
            ? t('syncConflictCopyDescription')
            : displayStatus.description;
  const actionLabel = isSyncing
    ? t('syncing')
    : model.primaryAction === 'open-settings'
      ? t('syncSettings')
      : model.primaryAction === 'resume-recovery'
        ? t('resumeRecovery')
        : model.primaryAction === 'retry'
          ? t('tryAgain')
          : model.primaryAction === 'open-conflict-copy'
            ? status?.notice && status.notice.items.length > 1
              ? t('openFirstConflictCopy')
              : t('openConflictCopy')
            : t('syncNow');

  const handleAction = async () => {
    if (model.primaryAction === 'open-settings' && onOpenSettings) {
      onOpenSettings();
      return;
    }

    if (
      model.primaryAction === 'open-conflict-copy' &&
      firstConflictItem &&
      vaultPath &&
      window.desktopAPI?.files?.showInFinder
    ) {
      try {
        await window.desktopAPI.files.showInFinder({
          path: `${vaultPath}/${firstConflictItem.path}`,
        });
      } catch (error) {
        console.error('[cloud-sync] 打开冲突副本失败', error);
      }
      return;
    }

    void triggerSync();
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-64">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${displayStatus.bgClass}`}>
              <StatusIcon
                className={`h-5 w-5 ${displayStatus.colorClass} ${displayStatus.animate ? 'animate-spin' : ''}`}
              />
            </div>
            <div className="flex-1 space-y-0.5">
              <h4 className="text-sm font-medium">{title}</h4>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {t('lastSync')}: {lastSyncLabel}
          </div>

          {model.calloutKind === 'conflict' && firstConflictItem ? (
            <div className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              {firstConflictItem.path}
            </div>
          ) : null}

          <Button
            size="sm"
            className="w-full"
            onClick={handleAction}
            disabled={isSyncing}
            variant={model.primaryAction === 'open-settings' ? 'secondary' : 'default'}
          >
            {actionLabel}
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
