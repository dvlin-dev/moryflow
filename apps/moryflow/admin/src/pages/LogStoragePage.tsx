/**
 * 日志存储管理页面
 */
import { useState } from 'react';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useActivityLogStorageStats, useCleanupActivityLogs } from '@/features/admin-logs';
import { formatDateTime } from '@/lib/format';
import {
  Alert01Icon,
  Chart01Icon,
  Clock01Icon,
  DatabaseIcon,
  Delete01Icon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/ui/icon';
import { toast } from 'sonner';

export default function LogStoragePage() {
  const [cleanupDays, setCleanupDays] = useState('30');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: stats, isLoading } = useActivityLogStorageStats();
  const cleanupMutation = useCleanupActivityLogs();

  const handleCleanup = async () => {
    const days = parseInt(cleanupDays, 10);
    if (isNaN(days) || days < 1) {
      toast.error('请输入有效的天数');
      return;
    }

    try {
      const result = await cleanupMutation.mutateAsync(days);
      toast.success(`成功清理 ${result.deletedCount} 条日志`);
      setShowConfirm(false);
    } catch {
      toast.error('清理失败');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="日志存储管理" description="查看日志存储统计，清理旧日志" />

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总日志数</CardTitle>
            <Icon icon={DatabaseIcon} className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : stats?.totalCount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">估算存储</CardTitle>
            <Icon icon={Chart01Icon} className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : `${stats?.estimatedSizeMB} MB`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最早日志</CardTitle>
            <Icon icon={Clock01Icon} className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {isLoading
                ? '-'
                : stats?.oldestLogDate
                  ? formatDateTime(stats.oldestLogDate)
                  : '无数据'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">错误日志</CardTitle>
            <Icon icon={Alert01Icon} className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {isLoading ? '-' : stats?.countByLevel?.error || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 分类统计 */}
      {stats?.countByCategory && Object.keys(stats.countByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>按分类统计</CardTitle>
            <CardDescription>各类事件日志数量分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Object.entries(stats.countByCategory).map(([category, count]) => (
                <div
                  key={category}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted"
                >
                  <span className="font-medium capitalize">{category}</span>
                  <span className="text-muted-foreground">
                    {(count as number).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 级别统计 */}
      {stats?.countByLevel && Object.keys(stats.countByLevel).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>按级别统计</CardTitle>
            <CardDescription>各级别日志数量分布</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(stats.countByLevel).map(([level, count]) => (
                <div
                  key={level}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    level === 'error'
                      ? 'bg-red-100 dark:bg-red-900/20'
                      : level === 'warn'
                        ? 'bg-yellow-100 dark:bg-yellow-900/20'
                        : 'bg-muted'
                  }`}
                >
                  <span className="font-medium uppercase">{level}</span>
                  <span className="text-muted-foreground">
                    {(count as number).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 清理操作 */}
      <Card>
        <CardHeader>
          <CardTitle>清理旧日志</CardTitle>
          <CardDescription>删除指定天数之前的日志记录。此操作不可撤销。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">删除</span>
              <Input
                type="number"
                min="1"
                max="3650"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">天之前的日志</span>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowConfirm(true)}
              disabled={cleanupMutation.isPending}
            >
              <Icon icon={Delete01Icon} className="h-4 w-4 mr-2" />
              清理日志
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 确认对话框 */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清理日志？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除 {cleanupDays} 天之前的所有日志记录。此操作不可撤销。
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
  );
}
