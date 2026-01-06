/**
 * 告警统计卡片
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, AlertCircle, Bell, TrendingUp } from 'lucide-react'
import type { AlertStatsResponse } from '../types'

interface AlertStatsCardsProps {
  stats?: AlertStatsResponse
  isLoading?: boolean
}

export function AlertStatsCards({ stats, isLoading }: AlertStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: '告警总数',
      value: stats?.total ?? 0,
      icon: Bell,
      color: 'text-blue-500',
    },
    {
      title: '严重',
      value: stats?.byLevel.critical ?? 0,
      icon: AlertCircle,
      color: 'text-red-500',
    },
    {
      title: '警告',
      value: stats?.byLevel.warning ?? 0,
      icon: AlertTriangle,
      color: 'text-yellow-500',
    },
    {
      title: '告警类型',
      value: Object.keys(stats?.byType ?? {}).length,
      icon: TrendingUp,
      color: 'text-purple-500',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
