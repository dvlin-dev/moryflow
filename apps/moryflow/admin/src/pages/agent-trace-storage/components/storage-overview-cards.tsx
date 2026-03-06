import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartBar, Database, Delete, Layers, type LucideIcon } from 'lucide-react';
import type { StorageStatsResponse } from '@/features/agent-traces';

interface StorageOverviewCardsProps {
  stats?: StorageStatsResponse | null;
  isLoading: boolean;
  pendingTotal: number;
}

interface OverviewCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  isLoading: boolean;
  valueClassName?: string;
}

function OverviewCard({
  title,
  value,
  icon: IconComponent,
  isLoading,
  valueClassName,
}: OverviewCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <IconComponent className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={`text-2xl font-bold ${valueClassName ?? ''}`}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function StorageOverviewCards({
  stats,
  isLoading,
  pendingTotal,
}: StorageOverviewCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <OverviewCard
        title="Trace 总数"
        value={(stats?.traceCount ?? 0).toLocaleString()}
        icon={Database}
        isLoading={isLoading}
      />
      <OverviewCard
        title="Span 总数"
        value={(stats?.spanCount ?? 0).toLocaleString()}
        icon={Layers}
        isLoading={isLoading}
      />
      <OverviewCard
        title="预估大小"
        value={`${stats?.estimatedSizeMB ?? 0} MB`}
        icon={ChartBar}
        isLoading={isLoading}
      />
      <OverviewCard
        title="待清理"
        value={pendingTotal.toLocaleString()}
        icon={Delete}
        isLoading={isLoading}
        valueClassName="text-orange-500"
      />
    </div>
  );
}
