/**
 * 用户管理页面
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, TierBadge, TableSkeleton, SimplePagination } from '@/components/shared';
import { Button } from '@/components/ui/button';
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
import { usePagination } from '@/hooks';
import { formatDate, formatNumber } from '@/lib/format';
import { TIER_OPTIONS } from '@/constants/tier';
import { useUsers, useSetUserTier, SetTierDialog } from '@/features/users';
import type { User, UserTier } from '@/types/api';
import { Setting06Icon, ViewIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/ui/icon';

const PAGE_SIZE = 20;

const TIER_FILTER_OPTIONS = [{ value: 'all', label: '全部等级' }, ...TIER_OPTIONS];

/** 删除状态筛选选项 */
const DELETED_FILTER_OPTIONS = [
  { value: 'all', label: '全部用户' },
  { value: 'active', label: '活跃用户' },
  { value: 'deleted', label: '已删除用户' },
];

const USER_TABLE_COLUMNS = [
  { width: 'w-24' },
  { width: 'w-40' },
  { width: 'w-16' },
  { width: 'w-16' },
  { width: 'w-8' },
  { width: 'w-24' },
  { width: 'w-24' },
  { width: 'w-20' },
];

/** 解析删除状态筛选值 */
function parseDeletedFilter(value: string): boolean | undefined {
  if (value === 'active') return false;
  if (value === 'deleted') return true;
  return undefined;
}

export default function UsersPage() {
  const [selectedTier, setSelectedTier] = useState('all');
  const [deletedFilter, setDeletedFilter] = useState('all');
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { page, setPage, getTotalPages, resetPage } = usePagination({ pageSize: PAGE_SIZE });

  const { data, isLoading } = useUsers({
    page,
    pageSize: PAGE_SIZE,
    tier: selectedTier,
    deleted: parseDeletedFilter(deletedFilter),
  });

  const setTierMutation = useSetUserTier();

  const users = data?.users || [];
  const totalPages = getTotalPages(data?.pagination.count || 0);

  const handleOpenTierDialog = (user: User) => {
    setSelectedUser(user);
    setTierDialogOpen(true);
  };

  const handleSetTier = (tier: UserTier) => {
    if (!selectedUser) return;
    setTierMutation.mutate(
      { userId: selectedUser.id, tier },
      {
        onSuccess: () => {
          setTierDialogOpen(false);
          setSelectedUser(null);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="用户管理" description="查看和管理所有用户信息" />

      {/* 筛选器 */}
      <div className="flex gap-2">
        <Select
          value={selectedTier}
          onValueChange={(value) => {
            setSelectedTier(value);
            resetPage();
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="选择等级" />
          </SelectTrigger>
          <SelectContent>
            {TIER_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={deletedFilter}
          onValueChange={(value) => {
            setDeletedFilter(value);
            resetPage();
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="用户状态" />
          </SelectTrigger>
          <SelectContent>
            {DELETED_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 用户列表 */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户 ID</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>等级</TableHead>
              <TableHead>剩余积分</TableHead>
              <TableHead>管理员</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={USER_TABLE_COLUMNS} />
            ) : users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id} className={user.deletedAt ? 'opacity-60' : ''}>
                  <TableCell className="font-mono text-xs">{user.id}</TableCell>
                  <TableCell className={user.deletedAt ? 'line-through' : ''}>
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <TierBadge tier={user.subscriptionTier} />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{formatNumber(user.credits)}</span>
                  </TableCell>
                  <TableCell>
                    {user.isAdmin ? (
                      <span className="text-green-600">是</span>
                    ) : (
                      <span className="text-muted-foreground">否</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    {user.deletedAt ? (
                      <span className="text-red-500 text-xs">
                        已删除 ({formatDate(user.deletedAt)})
                      </span>
                    ) : (
                      <span className="text-green-600 text-xs">活跃</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/users/${user.id}`}>
                          <Icon icon={ViewIcon} className="h-4 w-4 mr-1" />
                          详情
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenTierDialog(user)}
                        disabled={!!user.deletedAt}
                      >
                        <Icon icon={Setting06Icon} className="h-4 w-4 mr-1" />
                        等级
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  暂无用户数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {users.length > 0 && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* 设置等级对话框 */}
      {selectedUser && (
        <SetTierDialog
          open={tierDialogOpen}
          onOpenChange={setTierDialogOpen}
          currentTier={selectedUser.subscriptionTier}
          onSubmit={handleSetTier}
          isLoading={setTierMutation.isPending}
        />
      )}
    </div>
  );
}
