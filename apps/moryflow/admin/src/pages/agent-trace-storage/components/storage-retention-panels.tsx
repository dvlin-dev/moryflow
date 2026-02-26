import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { StorageStatsResponse } from '@/features/agent-traces';

interface StorageRetentionPanelsProps {
  stats?: StorageStatsResponse | null;
  isLoading: boolean;
}

function RetentionPolicyContent({ stats }: { stats?: StorageStatsResponse | null }) {
  return (
    <>
      <div className="flex items-center justify-between rounded-lg bg-muted p-3">
        <div>
          <p className="font-medium">成功记录</p>
          <p className="text-sm text-muted-foreground">执行成功的 Trace</p>
        </div>
        <Badge variant="outline" className="text-lg">
          {stats?.retentionSuccess ?? 0} 天
        </Badge>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-muted p-3">
        <div>
          <p className="font-medium">失败记录</p>
          <p className="text-sm text-muted-foreground">失败/中断的 Trace</p>
        </div>
        <Badge variant="outline" className="text-lg">
          {stats?.retentionFailed ?? 0} 天
        </Badge>
      </div>
    </>
  );
}

function PendingCleanupContent({ stats }: { stats?: StorageStatsResponse | null }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">完成（超过 {stats?.retentionSuccess ?? 0} 天）</span>
        <span className="font-mono font-medium">{(stats?.pendingCleanup.success ?? 0).toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">失败（超过 {stats?.retentionFailed ?? 0} 天）</span>
        <span className="font-mono font-medium">{(stats?.pendingCleanup.failed ?? 0).toLocaleString()}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">进行中（超过 {stats?.retentionSuccess ?? 0} 天）</span>
        <span className="font-mono font-medium">{(stats?.pendingCleanup.pending ?? 0).toLocaleString()}</span>
      </div>
    </>
  );
}

export function StorageRetentionPanels({ stats, isLoading }: StorageRetentionPanelsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>保留策略</CardTitle>
          <CardDescription>自动清理任务每天凌晨 3:00 执行</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (
            <RetentionPolicyContent stats={stats} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>待清理详情</CardTitle>
          <CardDescription>下次清理时将被删除的记录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <PendingCleanupContent stats={stats} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
