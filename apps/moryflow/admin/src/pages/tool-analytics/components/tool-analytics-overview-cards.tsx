import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ToolAnalyticsSummary } from '../metrics';
import { Clock, TriangleAlert, TrendingUp, Wrench, type LucideIcon } from 'lucide-react';
import { formatDuration, formatNumber } from '@/lib/format';

interface ToolAnalyticsOverviewCardsProps {
  isLoading: boolean;
  summary: ToolAnalyticsSummary;
  toolCount: number;
}

interface OverviewCardProps {
  title: string;
  icon: LucideIcon;
  value: string;
  isLoading: boolean;
}

function OverviewCard({ title, icon: IconComponent, value, isLoading }: OverviewCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <IconComponent className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{value}</div>}
      </CardContent>
    </Card>
  );
}

export function ToolAnalyticsOverviewCards({
  isLoading,
  summary,
  toolCount,
}: ToolAnalyticsOverviewCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <OverviewCard title="Tool 总数" icon={Wrench} value={formatNumber(toolCount)} isLoading={isLoading} />
      <OverviewCard
        title="调用总数"
        icon={TrendingUp}
        value={formatNumber(summary.totalCalls)}
        isLoading={isLoading}
      />
      <OverviewCard
        title="失败率"
        icon={TriangleAlert}
        value={`${summary.overallFailureRate.toFixed(1)}%`}
        isLoading={isLoading}
      />
      <OverviewCard
        title="平均耗时"
        icon={Clock}
        value={formatDuration(summary.avgDuration)}
        isLoading={isLoading}
      />
    </div>
  );
}
