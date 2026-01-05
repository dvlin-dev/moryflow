/**
 * 同步状态悬浮面板
 * Hover 到同步图标时显示详细状态信息，包括最近活动和待同步文件
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CloudIcon,
  CloudOffIcon,
  Loader2Icon,
  AlertCircleIcon,
  RefreshCwIcon,
  SettingsIcon,
  FileIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TrashIcon,
  XCircleIcon,
} from 'lucide-react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@moryflow/ui/components/hover-card'
import { Button } from '@moryflow/ui/components/button'
import { Separator } from '@moryflow/ui/components/separator'
import { Progress } from '@moryflow/ui/components/progress'
import { ScrollArea } from '@moryflow/ui/components/scroll-area'
import { useCloudSync } from '@/hooks/use-cloud-sync'
import { useTranslation } from '@/lib/i18n'
import type { SyncEngineStatus, SyncStatusDetail, SyncActivity, PendingFile } from '@shared/ipc'

// ── 状态配置 ────────────────────────────────────────────────

type StatusConfig = {
  icon: typeof CloudIcon
  title: string
  description: string
  colorClass: string
  bgClass: string
  animate?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getStatusConfig = (t: any): Record<SyncEngineStatus, StatusConfig> => ({
  idle: {
    icon: CloudIcon,
    title: t('synced'),
    description: t('allChangesSynced'),
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
  },
  syncing: {
    icon: Loader2Icon,
    title: t('syncing'),
    description: t('syncingChanges'),
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    animate: true,
  },
  offline: {
    icon: CloudOffIcon,
    title: t('offline'),
    description: t('waitingForNetwork'),
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
  },
  disabled: {
    icon: CloudIcon,
    title: t('notEnabled'),
    description: t('cloudSyncNotEnabled'),
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
  },
})

// ── 时间格式化 ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatLastSyncTime = (timestamp: number | null, t: any): string => {
  if (!timestamp) return t('neverSynced')

  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 60) return t('justNow')
  if (minutes < 60) return t('minutesAgo', { count: minutes })
  if (hours < 24) return t('hoursAgo', { count: hours })

  const date = new Date(timestamp)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()

  if (isToday) {
    return `${t('today')} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
  }

  return date.toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatActivityTime = (timestamp: number | undefined, t: any): string => {
  if (!timestamp) return ''

  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)

  if (seconds < 60) return t('justNow')
  if (minutes < 60) return t('minutesAgo', { count: minutes })
  return t('hoursAgo', { count: Math.floor(minutes / 60) })
}

// ── 方向图标 ────────────────────────────────────────────────

const DirectionIcon = ({ direction, className }: { direction: string; className?: string }) => {
  switch (direction) {
    case 'upload':
      return <ArrowUpIcon className={className} />
    case 'download':
      return <ArrowDownIcon className={className} />
    case 'delete':
      return <TrashIcon className={className} />
    default:
      return <FileIcon className={className} />
  }
}

// ── 组件 Props ────────────────────────────────────────────────

type SyncStatusHoverCardProps = {
  children: ReactNode
  vaultPath?: string | null
  onOpenSettings?: () => void
}

// ── 主组件 ────────────────────────────────────────────────────

export const SyncStatusHoverCard = ({
  children,
  vaultPath,
  onOpenSettings,
}: SyncStatusHoverCardProps) => {
  const { t } = useTranslation('workspace')
  const STATUS_CONFIG = useMemo(() => getStatusConfig(t), [t])
  const { status, binding, triggerSync, getStatusDetail } = useCloudSync(vaultPath)
  const [detail, setDetail] = useState<SyncStatusDetail | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // 追踪上次的引擎状态，避免频繁请求
  const prevEngineStatusRef = useRef<string | undefined>(undefined)

  // 当 hover 打开时，获取详细状态
  const loadDetail = useCallback(async () => {
    try {
      const data = await getStatusDetail()
      setDetail(data)
    } catch (error) {
      console.error('Failed to load sync detail:', error)
    }
  }, [getStatusDetail])

  // 打开时加载详情
  useEffect(() => {
    if (!isOpen) return

    const currentStatus = status?.engineStatus

    // 首次打开时加载
    if (prevEngineStatusRef.current === undefined) {
      prevEngineStatusRef.current = currentStatus
      void loadDetail()
      return
    }

    // 状态真正变化时才刷新（避免 syncing 状态下频繁刷新）
    if (currentStatus !== prevEngineStatusRef.current) {
      prevEngineStatusRef.current = currentStatus
      // 只在从 syncing 变为其他状态时刷新（同步完成）
      if (prevEngineStatusRef.current === 'syncing' || currentStatus !== 'syncing') {
        void loadDetail()
      }
    }
  }, [isOpen, loadDetail, status?.engineStatus])

  // 关闭时重置 ref
  useEffect(() => {
    if (!isOpen) {
      prevEngineStatusRef.current = undefined
    }
  }, [isOpen])

  // 计算显示状态
  const displayStatus = useMemo((): StatusConfig & { hasError: boolean } => {
    // 未绑定 vault 时显示为未启用
    if (!binding) {
      return { ...STATUS_CONFIG.disabled, hasError: false }
    }

    // 有错误时特殊显示
    if (status?.error) {
      return {
        icon: AlertCircleIcon,
        title: t('syncFailed'),
        description: status.error,
        colorClass: 'text-destructive',
        bgClass: 'bg-destructive/10',
        hasError: true,
      }
    }

    const engineStatus = status?.engineStatus ?? 'disabled'
    return { ...STATUS_CONFIG[engineStatus], hasError: false }
  }, [status, binding, t, STATUS_CONFIG])

  const Icon = displayStatus.icon
  const pendingCount = status?.pendingCount ?? 0
  const lastSyncAt = status?.lastSyncAt ?? null

  // 处理立即同步
  const handleSync = () => {
    void triggerSync()
  }

  // 渲染状态头部
  const renderStatusHeader = () => (
    <div className="flex items-start gap-3">
      <div className={`rounded-lg p-2 ${displayStatus.bgClass}`}>
        <Icon
          className={`h-5 w-5 ${displayStatus.colorClass} ${displayStatus.animate ? 'animate-spin' : ''}`}
        />
      </div>
      <div className="flex-1 space-y-0.5">
        <h4 className="text-sm font-medium">{displayStatus.title}</h4>
        <p className="text-xs text-muted-foreground">{displayStatus.description}</p>
      </div>
    </div>
  )

  // 渲染同步进度（同步中时显示）
  const renderSyncProgress = () => {
    if (status?.engineStatus !== 'syncing') return null

    const progress = detail?.overallProgress
    const current = detail?.currentActivity

    return (
      <div className="space-y-2">
        {/* 总进度条 */}
        {progress && progress.total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('syncProgress')}</span>
              <span>{progress.completed}/{progress.total}</span>
            </div>
            <Progress value={(progress.completed / progress.total) * 100} className="h-1.5" />
          </div>
        )}

        {/* 当前正在同步的文件 */}
        {current && (
          <div className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2">
            <Loader2Icon className="h-3.5 w-3.5 animate-spin text-primary" />
            <DirectionIcon direction={current.direction} className="h-3 w-3 text-muted-foreground" />
            <span className="flex-1 truncate text-xs">{current.fileName}</span>
            {current.progress !== undefined && (
              <span className="text-xs text-muted-foreground">{current.progress}%</span>
            )}
          </div>
        )}
      </div>
    )
  }

  // 渲染最近活动列表
  const renderRecentActivities = () => {
    const activities = detail?.recentActivities
    if (!activities || activities.length === 0) return null

    return (
      <div className="space-y-1.5">
        <h5 className="text-xs font-medium text-muted-foreground">{t('recentActivity')}</h5>
        <ScrollArea className="max-h-28">
          <div className="space-y-1">
            {activities.map((activity: SyncActivity) => (
              <div
                key={`${activity.fileId}-${activity.completedAt}`}
                className="flex items-center gap-2 px-1 py-0.5 text-xs"
              >
                {activity.status === 'failed' ? (
                  <XCircleIcon className="h-3 w-3 shrink-0 text-destructive" />
                ) : (
                  <DirectionIcon
                    direction={activity.direction}
                    className="h-3 w-3 shrink-0 text-muted-foreground"
                  />
                )}
                <span className="flex-1 truncate">{activity.fileName}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatActivityTime(activity.completedAt, t)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }

  // 渲染待同步文件列表
  const renderPendingFiles = () => {
    // 同步中时不显示待同步列表（显示进度）
    if (status?.engineStatus === 'syncing') return null

    const files = detail?.pendingFiles
    if (!files || files.length === 0) {
      if (pendingCount === 0) return null
      // 有 pendingCount 但没有详细列表时，显示简单提示
      return (
        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
          <FileIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t('changesPending', { count: pendingCount })}</span>
        </div>
      )
    }

    return (
      <div className="space-y-1.5">
        <h5 className="text-xs font-medium text-muted-foreground">
          {t('pendingSync')} ({files.length})
        </h5>
        <ScrollArea className="max-h-20">
          <div className="space-y-1">
            {files.slice(0, 5).map((file: PendingFile, index: number) => (
              <div
                key={`${file.relativePath}-${index}`}
                className="flex items-center gap-2 px-1 py-0.5 text-xs text-muted-foreground"
              >
                <DirectionIcon direction={file.direction} className="h-3 w-3 shrink-0" />
                <span className="flex-1 truncate">{file.fileName}</span>
              </div>
            ))}
            {files.length > 5 && (
              <div className="px-1 py-0.5 text-xs text-muted-foreground">
                {t('moreFiles', { count: files.length - 5 })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    )
  }

  // 渲染底部信息
  const renderFooter = () => (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">
        {t('lastSync')}：{formatLastSyncTime(lastSyncAt, t)}
      </span>
      <div className="flex items-center gap-1">
        {binding && (displayStatus.hasError || status?.engineStatus === 'idle') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={handleSync}
          >
            <RefreshCwIcon className="h-3.5 w-3.5" />
            {t('syncNow')}
          </Button>
        )}
        {onOpenSettings && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onOpenSettings}
          >
            <SettingsIcon className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <HoverCard openDelay={150} closeDelay={300} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-72 p-0">
        <div className="space-y-3 p-4">
          {renderStatusHeader()}
          {renderSyncProgress()}
          {renderRecentActivities()}
          {renderPendingFiles()}
        </div>
        <Separator />
        <div className="px-4 py-2">{renderFooter()}</div>
      </HoverCardContent>
    </HoverCard>
  )
}
