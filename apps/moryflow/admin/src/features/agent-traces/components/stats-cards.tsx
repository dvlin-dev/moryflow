/**
 * Agent Traces 统计卡片组
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon, type HugeIcon } from '@/components/ui/icon';
import {
  AnalyticsDownIcon,
  AnalyticsUpIcon,
  ArrowReloadHorizontalIcon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  Clock01Icon,
} from '@hugeicons/core-free-icons';
import { formatNumber, formatDuration } from '@/lib/format';
import type { StatsResponse } from '../types';

interface StatsCardsProps {
  data?: StatsResponse;
  isLoading?: boolean;
}

function TrendIndicator({ value, inverse = false }: { value: number; inverse?: boolean }) {
  if (value === 0) return null;

  // inverse: 对于失败数等指标，下降是好的（绿色），上升是坏的（红色）
  const isPositive = inverse ? value < 0 : value > 0;
  const icon = value > 0 ? AnalyticsUpIcon : AnalyticsDownIcon;
  const color = isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${color}`}>
      <Icon icon={icon} className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: HugeIcon;
  trend?: number;
  inverseTrend?: boolean;
  isLoading?: boolean;
}

function StatCard({ title, value, icon, trend, inverseTrend, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">
          <Icon icon={icon} className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? formatNumber(value) : value}
        </div>
        {trend !== undefined && (
          <div className="mt-1">
            <TrendIndicator value={trend} inverse={inverseTrend} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsCards({ data, isLoading }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="总执行次数"
        value={data?.totalRuns ?? 0}
        icon={ArrowReloadHorizontalIcon}
        trend={data?.trends.totalRuns}
        isLoading={isLoading}
      />
      <StatCard
        title="成功率"
        value={`${(data?.successRate ?? 0).toFixed(1)}%`}
        icon={CheckmarkCircle01Icon}
        trend={data?.trends.successRate}
        isLoading={isLoading}
      />
      <StatCard
        title="失败 Tool 数"
        value={data?.failedToolCount ?? 0}
        icon={CancelCircleIcon}
        trend={data?.trends.failedToolCount}
        inverseTrend
        isLoading={isLoading}
      />
      <StatCard
        title="平均耗时"
        value={data ? formatDuration(data.avgDuration) : '0ms'}
        icon={Clock01Icon}
        trend={data?.trends.avgDuration}
        inverseTrend
        isLoading={isLoading}
      />
    </div>
  );
}
