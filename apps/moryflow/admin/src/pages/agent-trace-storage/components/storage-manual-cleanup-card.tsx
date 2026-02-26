import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Delete } from 'lucide-react';

interface StorageManualCleanupCardProps {
  isLoading: boolean;
  isCleaning: boolean;
  pendingTotal: number;
  rangeLabel: string;
  onOpenConfirm: () => void;
}

export function StorageManualCleanupCard({
  isLoading,
  isCleaning,
  pendingTotal,
  rangeLabel,
  onOpenConfirm,
}: StorageManualCleanupCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>手动清理</CardTitle>
        <CardDescription>立即执行清理，无需等待定时任务</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">数据范围</p>
            {isLoading ? <Skeleton className="h-5 w-64" /> : <p className="font-medium">{rangeLabel}</p>}
          </div>
          <Button
            variant="destructive"
            onClick={onOpenConfirm}
            disabled={isCleaning || pendingTotal === 0}
          >
            <Delete className="mr-2 h-4 w-4" />
            {isCleaning ? '清理中...' : '立即清理'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
