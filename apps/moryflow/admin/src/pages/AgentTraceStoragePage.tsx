/**
 * Agent Trace 存储管理页面
 * 显示存储统计，支持手动清理
 */

import { useState } from 'react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CircleX, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useStorageStats, useTriggerCleanup } from '@/features/agent-traces';
import {
  calculatePendingCleanupTotal,
  getStorageDateRangeLabel,
  resolveStorageStatsViewState,
} from './agent-trace-storage/metrics';
import {
  StorageCleanupConfirmDialog,
  StorageManualCleanupCard,
  StorageOverviewCards,
  StorageRetentionPanels,
  StorageStatusDistributionCard,
} from './agent-trace-storage/components';

function StorageStatsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <CircleX className="mx-auto mb-4 h-10 w-10 text-destructive" />
        <p className="text-destructive">存储统计加载失败，请稍后重试</p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          重新加载
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AgentTraceStoragePage() {
  const [showConfirm, setShowConfirm] = useState(false);
  const { data: stats, isLoading, error, refetch } = useStorageStats();
  const cleanupMutation = useTriggerCleanup();
  const pendingTotal = calculatePendingCleanupTotal(stats);
  const viewState = resolveStorageStatsViewState({
    isLoading,
    error,
    hasStats: !!stats,
  });
  const rangeLabel = getStorageDateRangeLabel(stats);

  const handleCleanup = async () => {
    try {
      const result = await cleanupMutation.mutateAsync();
      toast.success(`清理完成：已删除 ${result.deletedCount} 条记录`);
      setShowConfirm(false);
    } catch {
      toast.error('清理失败');
    }
  };

  const renderContentByState = () => {
    switch (viewState) {
      case 'error':
        return <StorageStatsError onRetry={() => refetch()} />;
      case 'loading':
      case 'ready':
      default:
        return (
          <>
            <StorageOverviewCards stats={stats} isLoading={isLoading} pendingTotal={pendingTotal} />
            <StorageStatusDistributionCard stats={stats} isLoading={isLoading} />
            <StorageRetentionPanels stats={stats} isLoading={isLoading} />
            <StorageManualCleanupCard
              isLoading={isLoading}
              isCleaning={cleanupMutation.isPending}
              pendingTotal={pendingTotal}
              rangeLabel={rangeLabel}
              onOpenConfirm={() => setShowConfirm(true)}
            />
          </>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="存储管理"
        description="查看存储统计和管理日志清理"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        }
      />

      {renderContentByState()}

      <StorageCleanupConfirmDialog
        open={showConfirm}
        pendingTotal={pendingTotal}
        isLoading={cleanupMutation.isPending}
        onOpenChange={setShowConfirm}
        onConfirm={handleCleanup}
      />
    </div>
  );
}
