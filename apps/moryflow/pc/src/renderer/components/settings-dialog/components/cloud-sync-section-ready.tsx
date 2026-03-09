import { ChevronDown, Cloud, HardDrive, Loader, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@moryflow/ui/components/collapsible';
import { Label } from '@moryflow/ui/components/label';
import { Progress } from '@moryflow/ui/components/progress';
import { Skeleton } from '@moryflow/ui/components/skeleton';
import { Switch } from '@moryflow/ui/components/switch';
import { cn } from '@/lib/utils';
import type { CloudSyncSettings, CloudUsageInfo, SyncStatusSnapshot } from '@shared/ipc';

export type CloudSyncStatusSummary = {
  icon: LucideIcon;
  label: string;
  colorClass: string;
};

type CloudSyncReadyContentProps = {
  labels: {
    cloudSyncTitle: string;
    cloudSyncSubtitle: string;
    advanced: string;
    usage: string;
    deviceInfo: string;
    storageSpace: string;
    currentPlan: (plan: string, size: string) => string;
  };
  callout?: {
    tone: 'info' | 'warning';
    title: string;
    description: string;
    detail?: string;
    actionLabel?: string;
    onAction?: () => void | Promise<void>;
  } | null;
  isEnabled: boolean;
  isLoaded: boolean;
  syncToggling: boolean;
  status: SyncStatusSnapshot | null;
  statusSummary: CloudSyncStatusSummary;
  isSyncing: boolean;
  lastSyncLabel: string;
  showAdvanced: boolean;
  onShowAdvancedChange: (open: boolean) => void;
  settings: CloudSyncSettings | null;
  onSyncToggle: (enabled: boolean) => void | Promise<void>;
  usage: CloudUsageInfo | null;
  usageLoading: boolean;
  onRefreshUsage: () => void | Promise<void>;
};

export const CloudSyncReadyContent = ({
  labels,
  callout,
  isEnabled,
  isLoaded,
  syncToggling,
  status,
  statusSummary,
  isSyncing,
  lastSyncLabel,
  showAdvanced,
  onShowAdvancedChange,
  settings,
  onSyncToggle,
  usage,
  usageLoading,
  onRefreshUsage,
}: CloudSyncReadyContentProps) => {
  const StatusIcon = statusSummary.icon;

  return (
    <div className="space-y-6">
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
                {labels.cloudSyncTitle}
              </Label>
              <p className="text-xs text-muted-foreground">{labels.cloudSyncSubtitle}</p>
            </div>
          </div>
          <Switch
            id="sync-main"
            checked={isEnabled}
            onCheckedChange={onSyncToggle}
            disabled={syncToggling || !isLoaded}
          />
        </div>

        {status && (
          <div className="mt-4 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
            <StatusIcon
              className={cn('h-3.5 w-3.5', statusSummary.colorClass, isSyncing && 'animate-spin')}
            />
            <span className={cn('font-medium', statusSummary.colorClass)}>
              {statusSummary.label}
            </span>
            <span>· {lastSyncLabel}</span>
          </div>
        )}

        {callout ? (
          <div
            className={cn(
              'mt-4 rounded-lg border px-3 py-3',
              callout.tone === 'warning'
                ? 'border-amber-500/30 bg-amber-500/10'
                : 'border-primary/20 bg-primary/5'
            )}
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">{callout.title}</p>
              <p className="text-xs text-muted-foreground">{callout.description}</p>
              {callout.detail ? (
                <p className="break-all text-xs text-muted-foreground">{callout.detail}</p>
              ) : null}
            </div>
            {callout.actionLabel && callout.onAction ? (
              <Button
                type="button"
                variant={callout.tone === 'warning' ? 'default' : 'secondary'}
                size="sm"
                className="mt-3"
                onClick={callout.onAction}
              >
                {callout.actionLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <Collapsible open={showAdvanced} onOpenChange={onShowAdvancedChange}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-between px-2 text-sm"
          >
            <span className="text-sm font-medium">{labels.advanced}</span>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-180')}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-6">
          {isEnabled && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{labels.usage}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRefreshUsage}
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
              <CloudSyncUsageState labels={labels} usage={usage} usageLoading={usageLoading} />
            </div>
          )}

          {settings && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{labels.deviceInfo}</h4>
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

type CloudSyncUsageStateProps = {
  labels: CloudSyncReadyContentProps['labels'];
  usage: CloudUsageInfo | null;
  usageLoading: boolean;
};

const CloudSyncUsageState = ({ labels, usage, usageLoading }: CloudSyncUsageStateProps) => {
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
            <span>{labels.storageSpace}</span>
          </div>
          <span className="text-muted-foreground">
            {formatBytes(usage.storage.used)} / {formatBytes(usage.storage.limit)}
          </span>
        </div>
        <Progress value={usage.storage.percentage} className="h-2" />
      </div>
      <p className="text-xs text-muted-foreground">
        {labels.currentPlan(usage.plan, formatBytes(usage.fileLimit.maxFileSize))}
      </p>
    </div>
  );
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
