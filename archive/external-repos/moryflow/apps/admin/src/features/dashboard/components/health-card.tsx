/**
 * 健康状态卡片组件
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'
import type { HealthStatus } from '@/types/api'

/** 健康状态颜色映射 */
const HEALTH_COLORS: Record<string, string> = {
  ok: 'text-green-600 dark:text-green-400',
  healthy: 'text-green-600 dark:text-green-400',
  degraded: 'text-yellow-600 dark:text-yellow-400',
  unhealthy: 'text-red-600 dark:text-red-400',
}

/** 健康状态文本映射 */
const HEALTH_TEXT: Record<string, string> = {
  ok: '正常',
  healthy: '正常',
  degraded: '降级',
  unhealthy: '异常',
}

/** 健康状态指示器颜色 */
const HEALTH_INDICATOR: Record<string, string> = {
  ok: 'bg-green-500',
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  unhealthy: 'bg-red-500',
}

interface HealthCardProps {
  health: HealthStatus | undefined
  isLoading: boolean
}

export function HealthCard({ health, isLoading }: HealthCardProps) {
  if (isLoading) {
    return (
      <Card className="col-span-full md:col-span-1">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-16" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!health) {
    return (
      <Card className="col-span-full md:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium">系统健康状态</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">无法获取健康状态</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full md:col-span-1">
      <CardHeader>
        <CardTitle className="text-sm font-medium">系统健康状态</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${HEALTH_INDICATOR[health.status]}`}
          />
          <span className={`text-2xl font-bold ${HEALTH_COLORS[health.status]}`}>
            {HEALTH_TEXT[health.status]}
          </span>
        </div>

        {/* 服务状态（使用 services 字段） */}
        {health.services && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">数据库</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`h-2 w-2 rounded-full ${
                    health.services.database ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm font-medium">
                  {health.services.database ? '正常' : '异常'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Redis</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`h-2 w-2 rounded-full ${
                    health.services.redis ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm font-medium">
                  {health.services.redis ? '正常' : '异常'}
                </span>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          更新时间：{formatDateTime(health.timestamp)}
        </p>
      </CardContent>
    </Card>
  )
}
