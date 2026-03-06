import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CircleAlert, CircleCheck, CircleX, Clock } from 'lucide-react';
import type { StorageStatsResponse } from '@/features/agent-traces';
import type { ComponentType } from 'react';

interface StorageStatusDistributionCardProps {
  stats?: StorageStatsResponse | null;
  isLoading: boolean;
}

interface StatusItemProps {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  className: string;
}

function StatusItem({ label, value, icon: IconComponent, className }: StatusItemProps) {
  return (
    <div className={`flex items-center justify-between rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <IconComponent className="h-5 w-5" />
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-lg font-bold">{value.toLocaleString()}</span>
    </div>
  );
}

export function StorageStatusDistributionCard({
  stats,
  isLoading,
}: StorageStatusDistributionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>状态分布</CardTitle>
        <CardDescription>按执行状态统计 Trace 数量</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <StatusItem
              label="完成"
              value={stats?.countByStatus.completed ?? 0}
              icon={CircleCheck}
              className="bg-green-50 text-green-700 dark:bg-green-900/20"
            />
            <StatusItem
              label="失败"
              value={stats?.countByStatus.failed ?? 0}
              icon={CircleX}
              className="bg-red-50 text-red-700 dark:bg-red-900/20"
            />
            <StatusItem
              label="中断"
              value={stats?.countByStatus.interrupted ?? 0}
              icon={CircleAlert}
              className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20"
            />
            <StatusItem
              label="进行中"
              value={stats?.countByStatus.pending ?? 0}
              icon={Clock}
              className="bg-blue-50 text-blue-700 dark:bg-blue-900/20"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
