/**
 * Agent Trace 存储管理页面
 * 显示存储统计，支持手动清理
 */

import { useState } from 'react'
import { PageHeader } from '@/components/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Database,
  Trash2,
  Clock,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Layers,
} from 'lucide-react'
import { useStorageStats, useTriggerCleanup } from '@/features/agent-traces'
import { formatDateTime } from '@/lib/format'
import { toast } from 'sonner'

export default function AgentTraceStoragePage() {
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: stats, isLoading, refetch } = useStorageStats()
  const cleanupMutation = useTriggerCleanup()

  const handleCleanup = async () => {
    try {
      const result = await cleanupMutation.mutateAsync()
      toast.success(`清理完成：已删除 ${result.deletedCount} 条记录`)
      setShowConfirm(false)
    } catch {
      toast.error('清理失败')
    }
  }

  const pendingTotal = stats
    ? stats.pendingCleanup.success + stats.pendingCleanup.failed + stats.pendingCleanup.pending
    : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="存储管理"
        description="查看存储统计和管理日志清理"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        }
      />

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trace 总数</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.traceCount.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Span 总数</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.spanCount.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">预估大小</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{stats?.estimatedSizeMB} MB</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待清理</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-orange-500">
                {pendingTotal.toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 状态分布 */}
      <Card>
        <CardHeader>
          <CardTitle>状态分布</CardTitle>
          <CardDescription>按执行状态统计 Trace 数量</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">完成</span>
                </div>
                <span className="text-lg font-bold">
                  {(stats?.countByStatus['completed'] ?? 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium">失败</span>
                </div>
                <span className="text-lg font-bold">
                  {(stats?.countByStatus['failed'] ?? 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">中断</span>
                </div>
                <span className="text-lg font-bold">
                  {(stats?.countByStatus['interrupted'] ?? 0).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">进行中</span>
                </div>
                <span className="text-lg font-bold">
                  {(stats?.countByStatus['pending'] ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 保留策略和清理 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 保留策略 */}
        <Card>
          <CardHeader>
            <CardTitle>保留策略</CardTitle>
            <CardDescription>
              自动清理任务每天凌晨 3:00 执行
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="font-medium">成功记录</p>
                    <p className="text-sm text-muted-foreground">
                      执行成功的 Trace
                    </p>
                  </div>
                  <Badge variant="outline" className="text-lg">
                    {stats?.retentionSuccess} 天
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="font-medium">失败记录</p>
                    <p className="text-sm text-muted-foreground">
                      失败/中断的 Trace
                    </p>
                  </div>
                  <Badge variant="outline" className="text-lg">
                    {stats?.retentionFailed} 天
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 待清理详情 */}
        <Card>
          <CardHeader>
            <CardTitle>待清理详情</CardTitle>
            <CardDescription>
              下次清理时将被删除的记录
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    完成（超过 {stats?.retentionSuccess} 天）
                  </span>
                  <span className="font-mono font-medium">
                    {stats?.pendingCleanup.success.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    失败（超过 {stats?.retentionFailed} 天）
                  </span>
                  <span className="font-mono font-medium">
                    {stats?.pendingCleanup.failed.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    进行中（超过 {stats?.retentionSuccess} 天）
                  </span>
                  <span className="font-mono font-medium">
                    {stats?.pendingCleanup.pending.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 数据范围和手动清理 */}
      <Card>
        <CardHeader>
          <CardTitle>手动清理</CardTitle>
          <CardDescription>
            立即执行清理，无需等待定时任务
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">数据范围</p>
              {isLoading ? (
                <Skeleton className="h-5 w-64" />
              ) : (
                <p className="font-medium">
                  {stats?.oldestDate
                    ? `${formatDateTime(stats.oldestDate)} - ${formatDateTime(stats.newestDate!)}`
                    : '暂无数据'}
                </p>
              )}
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowConfirm(true)}
              disabled={cleanupMutation.isPending || pendingTotal === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {cleanupMutation.isPending ? '清理中...' : '立即清理'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 确认对话框 */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清理</AlertDialogTitle>
            <AlertDialogDescription>
              将永久删除 {pendingTotal.toLocaleString()} 条过期记录及其关联的 Span。
              此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认清理
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
