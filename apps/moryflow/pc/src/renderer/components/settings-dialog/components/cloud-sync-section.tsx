/**
 * [PROPS]: vaultPath
 * [EMITS]: none
 * [POS]: 云同步设置区块（主开关 + 状态 + Advanced，Lucide icons direct render）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CircleAlert,
  CircleCheck,
  ChevronDown,
  Cloud,
  FolderSync,
  HardDrive,
  Loader,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@moryflow/ui/components/switch';
import { Button } from '@moryflow/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@moryflow/ui/components/collapsible';
import { Label } from '@moryflow/ui/components/label';
import { Progress } from '@moryflow/ui/components/progress';
import { Skeleton } from '@moryflow/ui/components/skeleton';
import { useAuth } from '@/lib/server';
import { useCloudSync } from '@/hooks/use-cloud-sync';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CloudUsageInfo } from '@shared/ipc';

type CloudSyncSectionProps = {
  vaultPath?: string | null;
};

export const CloudSyncSection = ({ vaultPath }: CloudSyncSectionProps) => {
  const { t } = useTranslation('settings');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { status, settings, binding, isLoaded, updateSettings, bindVault, getUsage } =
    useCloudSync(vaultPath);

  // 用量信息
  const [usage, setUsage] = useState<CloudUsageInfo | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 操作状态
  const [syncToggling, setSyncToggling] = useState(false);

  // 加载用量信息
  const loadUsage = useCallback(async () => {
    if (!isAuthenticated) return;
    setUsageLoading(true);
    try {
      const data = await getUsage();
      setUsage(data);
    } finally {
      setUsageLoading(false);
    }
  }, [getUsage, isAuthenticated]);

  // 初始加载用量
  useEffect(() => {
    if (!showAdvanced) return;
    if (isAuthenticated && isLoaded && binding) {
      void loadUsage();
    }
  }, [showAdvanced, isAuthenticated, isLoaded, binding, loadUsage]);

  // 处理云同步开关（核心逻辑：自动绑定）
  const handleSyncToggle = useCallback(
    async (enabled: boolean) => {
      if (!vaultPath) return;

      setSyncToggling(true);
      try {
        if (enabled) {
          // 开启云同步：如果未绑定，自动绑定
          if (!binding) {
            const result = await bindVault(vaultPath);
            if (!result) {
              toast.error(t('cloudSyncEnableFailed'));
              return;
            }
            toast.success(t('cloudSyncEnabled'));
          }
          await updateSettings({ syncEnabled: true });
        } else {
          // 关闭云同步
          await updateSettings({ syncEnabled: false });
          toast.info(t('cloudSyncPaused'));
        }
      } catch (error) {
        console.error('[cloud-sync] 切换失败:', error);
        toast.error(t('operationFailed'));
      } finally {
        setSyncToggling(false);
      }
    },
    [vaultPath, binding, bindVault, updateSettings, t]
  );

  // 处理向量化开关
  const handleVectorizeToggle = useCallback(
    async (enabled: boolean) => {
      await updateSettings({ vectorizeEnabled: enabled });
    },
    [updateSettings]
  );

  const sectionState = useMemo(() => {
    if (authLoading) return 'auth-loading';
    if (!isAuthenticated) return 'unauthenticated';
    if (!vaultPath) return 'missing-vault';
    return 'ready';
  }, [authLoading, isAuthenticated, vaultPath]);

  const renderContentByState = () => {
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
    return renderContentByState();
  }

  const isSyncing = status?.engineStatus === 'syncing';
  const isEnabled = binding && settings?.syncEnabled;
  const engineStatus = status?.engineStatus ?? 'disabled';
  const needsAttention =
    !binding || engineStatus === 'offline' || engineStatus === 'disabled' || !!status?.error;

  const statusSummary = useMemo(() => {
    if (isSyncing) {
      return { icon: Loader, label: t('cloudSyncSyncing'), colorClass: 'text-primary' };
    }

    if (needsAttention) {
      return {
        icon: CircleAlert,
        label: t('cloudSyncNeedsAttention'),
        colorClass: 'text-amber-500',
      };
    }

    return {
      icon: CircleCheck,
      label: t('cloudSyncSynced'),
      colorClass: 'text-success',
    };
  }, [isSyncing, needsAttention, t]) as { icon: LucideIcon; label: string; colorClass: string };

  const lastSyncLabel = useMemo(() => {
    if (!status?.lastSyncAt) return t('cloudSyncNeverSynced');
    return t('cloudSyncLastSync', {
      time: new Date(status.lastSyncAt).toLocaleTimeString(),
    });
  }, [status?.lastSyncAt, t]);

  const renderUsageByState = () => {
    if (usageLoading && !usage) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      );
    }

    if (!usage) {
      return null;
    }

    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-background p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span>{t('storageSpace')}</span>
            </div>
            <span className="text-muted-foreground">
              {formatBytes(usage.storage.used)} / {formatBytes(usage.storage.limit)}
            </span>
          </div>
          <Progress value={usage.storage.percentage} className="h-2" />
        </div>

        <div className="rounded-xl bg-background p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span>{t('smartIndex')}</span>
            </div>
            <span className="text-muted-foreground">
              {t('filesCount', { count: usage.vectorized.count })} / {usage.vectorized.limit}
            </span>
          </div>
          <Progress value={usage.vectorized.percentage} className="h-2" />
        </div>

        <p className="text-xs text-muted-foreground">
          {t('currentPlan', {
            plan: usage.plan,
            size: formatBytes(usage.fileLimit.maxFileSize),
          })}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 云同步主开关 */}
      <div className="rounded-xl bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isEnabled ? 'bg-primary/10' : 'bg-muted'
              }`}
            >
              <Cloud
                className={`h-5 w-5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`}
              />
            </div>
            <div>
              <Label htmlFor="sync-main" className="text-sm font-medium">
                {t('cloudSyncTitle')}
              </Label>
              <p className="text-xs text-muted-foreground">{t('cloudSyncSubtitle')}</p>
            </div>
          </div>
          <Switch
            id="sync-main"
            checked={isEnabled ?? false}
            onCheckedChange={handleSyncToggle}
            disabled={syncToggling || !isLoaded}
          />
        </div>

        {/* 同步状态 */}
        {status && (
          <div className="mt-4 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
            {(() => {
              const StatusIcon = statusSummary.icon;
              return (
                <StatusIcon
                  className={cn(
                    'h-3.5 w-3.5',
                    statusSummary.colorClass,
                    isSyncing && 'animate-spin'
                  )}
                />
              );
            })()}
            <span className={cn('font-medium', statusSummary.colorClass)}>
              {statusSummary.label}
            </span>
            <span>· {lastSyncLabel}</span>
          </div>
        )}
      </div>

      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-between px-2 text-sm"
          >
            <span className="text-sm font-medium">{t('advanced')}</span>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-180')}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-6">
          {/* 智能索引开关 */}
          <div className="flex items-center justify-between rounded-xl bg-background p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <Label htmlFor="vectorize-enabled" className="text-sm font-medium">
                  {t('smartIndex')}
                </Label>
                <p className="text-xs text-muted-foreground">{t('smartIndexDescription')}</p>
              </div>
            </div>
            <Switch
              id="vectorize-enabled"
              checked={settings?.vectorizeEnabled ?? false}
              onCheckedChange={handleVectorizeToggle}
              disabled={!isEnabled}
            />
          </div>

          {/* 用量信息 */}
          {isEnabled && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{t('usage')}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={loadUsage}
                  disabled={usageLoading}
                  className="h-7 px-2 text-xs"
                >
                  {usageLoading ? (
                    <Loader className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {renderUsageByState()}
            </div>
          )}

          {/* 设备信息 */}
          {settings && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t('deviceInfo')}</h4>
              <div className="rounded-xl bg-background p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{settings.deviceName}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {settings.deviceId.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

/** 格式化字节数 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
