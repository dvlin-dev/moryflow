/**
 * [PROPS]: vaultPath
 * [EMITS]: none
 * [POS]: 云同步设置区块容器（状态判定 + 行为编排）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Cloud, FolderSync, Loader, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@moryflow/ui/components/skeleton';
import { useAuth } from '@/lib/server';
import { useCloudSync } from '@/hooks/use-cloud-sync';
import { useTranslation } from '@/lib/i18n';
import type { CloudUsageInfo } from '@shared/ipc';
import { resolveSyncStatusModel } from '@/components/cloud-sync/sync-status-model';
import { CloudSyncReadyContent, type CloudSyncStatusSummary } from './cloud-sync-section-ready';
import {
  resolveCloudSyncSectionState,
  type CloudSyncSectionState,
} from './cloud-sync-section-model';

type CloudSyncSectionProps = {
  vaultPath?: string | null;
};

export const CloudSyncSection = ({ vaultPath }: CloudSyncSectionProps) => {
  const { t } = useTranslation('settings');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { status, settings, binding, isLoaded, updateSettings, bindVault, getUsage, triggerSync } =
    useCloudSync(vaultPath);

  const [usage, setUsage] = useState<CloudUsageInfo | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [syncToggling, setSyncToggling] = useState(false);

  const loadUsage = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    setUsageLoading(true);
    try {
      const data = await getUsage();
      setUsage(data);
    } finally {
      setUsageLoading(false);
    }
  }, [getUsage, isAuthenticated]);

  useEffect(() => {
    if (!showAdvanced) {
      return;
    }
    if (isAuthenticated && isLoaded && binding) {
      void loadUsage();
    }
  }, [showAdvanced, isAuthenticated, isLoaded, binding, loadUsage]);

  const handleSyncToggle = useCallback(
    async (enabled: boolean) => {
      if (!vaultPath) {
        return;
      }

      setSyncToggling(true);
      try {
        if (enabled) {
          if (!binding) {
            const result = await bindVault(vaultPath);
            if (!result) {
              toast.error(t('cloudSyncEnableFailed'));
              return;
            }
            toast.success(t('cloudSyncEnabled'));
          }
          await updateSettings({ syncEnabled: true });
          return;
        }

        await updateSettings({ syncEnabled: false });
        toast.info(t('cloudSyncPaused'));
      } catch (error) {
        console.error('[cloud-sync] 切换失败:', error);
        toast.error(t('operationFailed'));
      } finally {
        setSyncToggling(false);
      }
    },
    [vaultPath, binding, bindVault, updateSettings, t]
  );

  const sectionState: CloudSyncSectionState = resolveCloudSyncSectionState({
    authLoading,
    isAuthenticated,
    vaultPath,
  });

  const renderUnavailableStateBySection = () => {
    switch (sectionState) {
      case 'auth-loading':
        return (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        );
      case 'unauthenticated':
        return (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <Cloud className="h-12 w-12 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-medium">{t('cloudSyncNeedLogin')}</p>
              <p className="text-sm text-muted-foreground">{t('cloudSyncNeedLoginDescription')}</p>
            </div>
          </div>
        );
      case 'missing-vault':
        return (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <FolderSync className="h-12 w-12 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-medium">{t('cloudSyncNeedVault')}</p>
              <p className="text-sm text-muted-foreground">{t('cloudSyncNeedVaultDescription')}</p>
            </div>
          </div>
        );
      case 'ready':
      default:
        return null;
    }
  };

  if (sectionState !== 'ready') {
    return renderUnavailableStateBySection();
  }

  const isSyncing = status?.engineStatus === 'syncing';
  const isEnabled = Boolean(binding && settings?.syncEnabled);
  const statusModel = resolveSyncStatusModel({
    hasBinding: Boolean(status?.vaultId),
    isSyncing,
    engineStatus: status?.engineStatus ?? 'disabled',
    hasError: Boolean(status?.error),
    notice: status?.notice ?? null,
  });

  const statusSummary: CloudSyncStatusSummary = (() => {
    switch (statusModel.tone) {
      case 'syncing':
        return {
          icon: Loader as LucideIcon,
          label: t('cloudSyncSyncing'),
          colorClass: 'text-primary',
        };
      case 'needs-attention':
        return {
          icon: CircleAlert as LucideIcon,
          label: t('cloudSyncNeedsAttention'),
          colorClass: 'text-amber-500',
        };
      case 'synced':
      default:
        return {
          icon: CircleCheck as LucideIcon,
          label: t('cloudSyncSynced'),
          colorClass: 'text-success',
        };
    }
  })();

  const lastSyncLabel = status?.lastSyncAt
    ? t('cloudSyncLastSync', { time: new Date(status.lastSyncAt).toLocaleTimeString() })
    : t('cloudSyncNeverSynced');
  const firstConflictItem = status?.notice?.items[0] ?? null;

  const handlePrimaryAction = useCallback(async () => {
    if (statusModel.primaryAction === 'open-settings') {
      return;
    }

    if (
      statusModel.primaryAction === 'open-conflict-copy' &&
      firstConflictItem &&
      vaultPath &&
      window.desktopAPI?.files?.showInFinder
    ) {
      try {
        await window.desktopAPI.files.showInFinder({
          path: `${vaultPath}/${firstConflictItem.path}`,
        });
      } catch (error) {
        console.error('[cloud-sync] 打开冲突副本失败:', error);
        toast.error(t('operationFailed'));
      }
      return;
    }

    await triggerSync();
  }, [firstConflictItem, statusModel.primaryAction, t, triggerSync, vaultPath]);

  const callout =
    statusModel.calloutKind === 'recovery'
      ? {
          tone: 'warning' as const,
          title: t('cloudSyncNeedsAttention'),
          description: t('cloudSyncRecoveryDescription'),
          actionLabel: t('cloudSyncResumeRecovery'),
          onAction: () => void handlePrimaryAction(),
        }
      : statusModel.calloutKind === 'offline'
        ? {
            tone: 'warning' as const,
            title: t('cloudSyncOffline'),
            description: t('cloudSyncOfflineDescription'),
            actionLabel: t('cloudSyncTryAgain'),
            onAction: () => void handlePrimaryAction(),
          }
        : statusModel.calloutKind === 'setup'
          ? {
              tone: 'warning' as const,
              title: t('cloudSyncNeedsAttention'),
              description: t('cloudSyncSetupDescription'),
              actionLabel: t('syncSettings'),
              onAction: undefined,
            }
          : statusModel.calloutKind === 'conflict'
            ? {
                tone: 'info' as const,
                title: t('cloudSyncConflictCopyReady'),
                description: t('cloudSyncConflictCopyDescription'),
                detail: firstConflictItem?.path,
                actionLabel:
                  status?.notice && status.notice.items.length > 1
                    ? t('cloudSyncOpenFirstConflictCopy')
                    : t('cloudSyncOpenConflictCopy'),
                onAction: () => void handlePrimaryAction(),
              }
            : null;

  return (
    <CloudSyncReadyContent
      labels={{
        cloudSyncTitle: t('cloudSyncTitle'),
        cloudSyncSubtitle: t('cloudSyncSubtitle'),
        advanced: t('advanced'),
        usage: t('usage'),
        deviceInfo: t('deviceInfo'),
        storageSpace: t('storageSpace'),
        currentPlan: (plan, size) => t('currentPlan', { plan, size }),
      }}
      callout={callout}
      isEnabled={isEnabled}
      isLoaded={isLoaded}
      syncToggling={syncToggling}
      status={status}
      statusSummary={statusSummary}
      isSyncing={isSyncing}
      lastSyncLabel={lastSyncLabel}
      showAdvanced={showAdvanced}
      onShowAdvancedChange={setShowAdvanced}
      settings={settings}
      onSyncToggle={handleSyncToggle}
      usage={usage}
      usageLoading={usageLoading}
      onRefreshUsage={loadUsage}
    />
  );
};
