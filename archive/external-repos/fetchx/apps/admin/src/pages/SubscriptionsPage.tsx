/**
 * Subscriptions 页面
 * 订阅管理
 */
import { useState } from 'react';
import { PageHeader, SimplePagination } from '@aiget/ui/composed';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Skeleton,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aiget/ui/primitives';
import { formatRelativeTime } from '@aiget/ui/lib';
import { Search, Pencil } from 'lucide-react';
import {
  useSubscriptions,
  useUpdateSubscription,
} from '@/features/subscriptions';
import type {
  SubscriptionListItem,
  SubscriptionQuery,
  SubscriptionTier,
  SubscriptionStatus,
} from '@/features/subscriptions';

const TIER_OPTIONS: SubscriptionTier[] = ['FREE', 'BASIC', 'PRO', 'TEAM'];
const STATUS_OPTIONS: SubscriptionStatus[] = ['ACTIVE', 'CANCELED', 'PAST_DUE', 'EXPIRED'];

export default function SubscriptionsPage() {
  const [query, setQuery] = useState<SubscriptionQuery>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<SubscriptionListItem | null>(null);
  const [editTier, setEditTier] = useState<SubscriptionTier>('FREE');
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>('ACTIVE');

  const { data, isLoading } = useSubscriptions(query);
  const { mutate: updateSubscription, isPending: isUpdating } = useUpdateSubscription();

  const handleSearch = () => {
    setQuery((prev) => ({ ...prev, page: 1, search: searchInput || undefined }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, page }));
  };

  const handleFilterTier = (tier: string) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      tier: tier === 'all' ? undefined : (tier as SubscriptionTier),
    }));
  };

  const handleFilterStatus = (status: string) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      status: status === 'all' ? undefined : (status as SubscriptionStatus),
    }));
  };

  const handleEdit = (subscription: SubscriptionListItem) => {
    setSelectedSubscription(subscription);
    setEditTier(subscription.tier);
    setEditStatus(subscription.status);
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (selectedSubscription) {
      updateSubscription(
        {
          id: selectedSubscription.id,
          data: { tier: editTier, status: editStatus },
        },
        {
          onSuccess: () => setEditDialogOpen(false),
        },
      );
    }
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'PRO':
      case 'TEAM':
        return 'default';
      case 'BASIC':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'CANCELED':
        return 'secondary';
      case 'PAST_DUE':
      case 'EXPIRED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description="管理用户订阅" />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>订阅列表</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={query.tier || 'all'} onValueChange={handleFilterTier}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="层级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部层级</SelectItem>
                  {TIER_OPTIONS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={query.status || 'all'} onValueChange={handleFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="搜索用户..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-48"
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">没有找到订阅</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>层级</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>当前周期</TableHead>
                    <TableHead>到期取消</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {subscription.userName || '未设置'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {subscription.userEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTierBadgeVariant(subscription.tier)}>
                          {subscription.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(subscription.status)}>
                          {subscription.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {subscription.currentPeriodEnd ? (
                          <span>
                            {new Date(subscription.currentPeriodStart).toLocaleDateString()}{' '}
                            -{' '}
                            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">永久</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {subscription.cancelAtPeriodEnd ? (
                          <Badge variant="secondary">是</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatRelativeTime(subscription.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(subscription)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.pagination.totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <SimplePagination
                    page={data.pagination.page}
                    totalPages={data.pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑订阅</DialogTitle>
            <DialogDescription>
              修改用户 {selectedSubscription?.userEmail} 的订阅信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">订阅层级</label>
              <Select value={editTier} onValueChange={(v) => setEditTier(v as SubscriptionTier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_OPTIONS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">订阅状态</label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as SubscriptionStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
