/**
 * 云同步设置 Section
 * 简化版：一个开关控制云同步，自动绑定
 */

import { useCallback, useEffect, useState } from 'react'
import {
  CloudIcon,
  HardDriveIcon,
  SparklesIcon,
  RefreshCwIcon,
  Loader2Icon,
  CheckCircle2Icon,
  FolderSyncIcon,
  AlertCircleIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@moryflow/ui/components/switch'
import { Button } from '@moryflow/ui/components/button'
import { Label } from '@moryflow/ui/components/label'
import { Progress } from '@moryflow/ui/components/progress'
import { Skeleton } from '@moryflow/ui/components/skeleton'
import { useAuth } from '@/lib/server'
import { useCloudSync } from '@/hooks/use-cloud-sync'
import { useTranslation } from '@/lib/i18n'
import type { CloudUsageInfo } from '@shared/ipc'

type CloudSyncSectionProps = {
  vaultPath?: string | null
}

export const CloudSyncSection = ({ vaultPath }: CloudSyncSectionProps) => {
  const { t } = useTranslation('settings')
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const {
    status,
    settings,
    binding,
    isLoaded,
    updateSettings,
    triggerSync,
    bindVault,
    getUsage,
  } = useCloudSync(vaultPath)

  // 用量信息
  const [usage, setUsage] = useState<CloudUsageInfo | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)

  // 操作状态
  const [syncToggling, setSyncToggling] = useState(false)
  const [syncingManually, setSyncingManually] = useState(false)

  // 加载用量信息
  const loadUsage = useCallback(async () => {
    if (!isAuthenticated) return
    setUsageLoading(true)
    try {
      const data = await getUsage()
      setUsage(data)
    } finally {
      setUsageLoading(false)
    }
  }, [getUsage, isAuthenticated])

  // 初始加载用量
  useEffect(() => {
    if (isAuthenticated && isLoaded && binding) {
      void loadUsage()
    }
  }, [isAuthenticated, isLoaded, binding, loadUsage])

  // 处理云同步开关（核心逻辑：自动绑定）
  const handleSyncToggle = useCallback(
    async (enabled: boolean) => {
      if (!vaultPath) return

      setSyncToggling(true)
      try {
        if (enabled) {
          // 开启云同步：如果未绑定，自动绑定
          if (!binding) {
            const result = await bindVault(vaultPath)
            if (!result) {
              toast.error(t('cloudSyncEnableFailed'))
              return
            }
            toast.success(t('cloudSyncEnabled'))
          }
          await updateSettings({ syncEnabled: true })
        } else {
          // 关闭云同步
          await updateSettings({ syncEnabled: false })
          toast.info(t('cloudSyncPaused'))
        }
      } catch (error) {
        console.error('[cloud-sync] 切换失败:', error)
        toast.error(t('operationFailed'))
      } finally {
        setSyncToggling(false)
      }
    },
    [vaultPath, binding, bindVault, updateSettings, t]
  )

  // 处理向量化开关
  const handleVectorizeToggle = useCallback(
    async (enabled: boolean) => {
      await updateSettings({ vectorizeEnabled: enabled })
    },
    [updateSettings]
  )

  // 手动触发同步
  const handleManualSync = useCallback(async () => {
    setSyncingManually(true)
    try {
      await triggerSync()
      toast.success(t('cloudSyncTriggered'))
    } finally {
      setTimeout(() => setSyncingManually(false), 1000)
    }
  }, [triggerSync, t])

  // 未登录状态
  if (authLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <CloudIcon className="h-12 w-12 text-muted-foreground/50" />
        <div className="space-y-1">
          <p className="font-medium">{t('cloudSyncNeedLogin')}</p>
          <p className="text-sm text-muted-foreground">{t('cloudSyncNeedLoginDescription')}</p>
        </div>
      </div>
    )
  }

  // 未选择 vault 状态
  if (!vaultPath) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <FolderSyncIcon className="h-12 w-12 text-muted-foreground/50" />
        <div className="space-y-1">
          <p className="font-medium">{t('cloudSyncNeedVault')}</p>
          <p className="text-sm text-muted-foreground">{t('cloudSyncNeedVaultDescription')}</p>
        </div>
      </div>
    )
  }

  const isSyncing = status?.engineStatus === 'syncing' || syncingManually
  const isEnabled = binding && settings?.syncEnabled

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
              <CloudIcon
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
        {isEnabled && status && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {status.engineStatus === 'syncing' ? (
                <>
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>{t('cloudSyncSyncing')}</span>
                </>
              ) : status.error ? (
                <>
                  <AlertCircleIcon className="h-3.5 w-3.5 text-destructive" />
                  <span>{t('cloudSyncFailed')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="h-3.5 w-3.5 text-success" />
                  <span>{t('cloudSyncSynced')}</span>
                </>
              )}
              {status.pendingCount > 0 && (
                <span>· {t('cloudSyncPendingFiles', { count: status.pendingCount })}</span>
              )}
              {status.lastSyncAt && (
                <span>· {t('cloudSyncLastSync', { time: new Date(status.lastSyncAt).toLocaleTimeString() })}</span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="h-7 px-2"
            >
              {isSyncing ? (
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCwIcon className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}

        {status?.error && <p className="mt-2 text-xs text-destructive">{status.error}</p>}
      </div>

      {/* 智能索引开关 */}
      <div className="flex items-center justify-between rounded-xl bg-background p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <SparklesIcon className="h-4 w-4 text-muted-foreground" />
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
                <Loader2Icon className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCwIcon className="h-3 w-3" />
              )}
            </Button>
          </div>

          {usageLoading && !usage ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : usage ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-background p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <HardDriveIcon className="h-4 w-4 text-muted-foreground" />
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
                    <SparklesIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{t('smartIndex')}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {t('filesCount', { count: usage.vectorized.count })} / {usage.vectorized.limit}
                  </span>
                </div>
                <Progress value={usage.vectorized.percentage} className="h-2" />
              </div>

              <p className="text-xs text-muted-foreground">
                {t('currentPlan', { plan: usage.plan, size: formatBytes(usage.fileLimit.maxFileSize) })}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* 设备信息 */}
      {settings && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">{t('deviceInfo')}</h4>
          <div className="rounded-xl bg-background p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <HardDriveIcon className="h-4 w-4 text-muted-foreground" />
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
    </div>
  )
}

/** 格式化字节数 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
