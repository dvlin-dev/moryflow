/**
 * 订阅管理页面
 */
import { useState } from 'react';
import {
  PageHeader,
  TableSkeleton,
  SimplePagination,
  StatusBadge,
  SUBSCRIPTION_STATUS_CONFIG,
} from '@/components/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { usePagination } from '@/hooks';
import { formatDate } from '@/lib/format';
import {
  useSubscriptions,
  useCancelSubscription,
  SUBSCRIPTION_STATUS_OPTIONS,
  SUBSCRIPTION_TABLE_COLUMNS,
  SubscriptionDetailDialog,
  CancelSubscriptionDialog,
} from '@/features/payment';
import type { Subscription } from '@/types/payment';
import { CancelCircleIcon, ViewIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/ui/icon';

const PAGE_SIZE = 20;

export default function SubscriptionsPage() {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { page, setPage, getTotalPages, resetPage } = usePagination({ pageSize: PAGE_SIZE });

  const { data, isLoading } = useSubscriptions({
    page,
    pageSize: PAGE_SIZE,
    status: selectedStatus,
  });

  const cancelMutation = useCancelSubscription();

  const subscriptions = data?.subscriptions || [];
  const totalPages = getTotalPages(data?.pagination.count || 0);

  const handleViewDetail = (sub: Subscription) => {
    setSelectedSub(sub);
    setDetailOpen(true);
  };

  const handleCancel = (sub: Subscription) => {
    setSelectedSub(sub);
    setCancelOpen(true);
  };

  const confirmCancel = () => {
    if (selectedSub) {
      cancelMutation.mutate(selectedSub.id, {
        onSuccess: () => {
          setCancelOpen(false);
          setSelectedSub(null);
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="订阅管理" description="查看和管理用户订阅" />

      {/* 筛选器 */}
      <div className="flex gap-2">
        <Select
          value={selectedStatus}
          onValueChange={(v) => {
            setSelectedStatus(v);
            resetPage();
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            {SUBSCRIPTION_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 订阅列表 */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>订阅 ID</TableHead>
              <TableHead>用户 ID</TableHead>
              <TableHead>产品 ID</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>当前周期结束</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={SUBSCRIPTION_TABLE_COLUMNS} />
            ) : subscriptions.length > 0 ? (
              subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-mono text-xs">{sub.id}</TableCell>
                  <TableCell className="font-mono text-xs">{sub.userId}</TableCell>
                  <TableCell className="font-mono text-xs">{sub.productId}</TableCell>
                  <TableCell>
                    <StatusBadge status={sub.status} configMap={SUBSCRIPTION_STATUS_CONFIG} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(sub.currentPeriodEnd)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(sub.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetail(sub)}>
                        <Icon icon={ViewIcon} className="h-4 w-4" />
                      </Button>
                      {(sub.status === 'active' || sub.status === 'trialing') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(sub)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Icon icon={CancelCircleIcon} className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  暂无订阅数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {subscriptions.length > 0 && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* 详情弹窗 */}
      <SubscriptionDetailDialog
        subscription={selectedSub}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      {/* 取消确认弹窗 */}
      <CancelSubscriptionDialog
        subscription={selectedSub}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={confirmCancel}
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
