/**
 * 用户管理页面
 */
import { useState } from 'react';
import { PageHeader, SimplePagination } from '@/components/shared';
import { usePagination } from '@/hooks';
import {
  useUsers,
  useSetUserTier,
  SetTierDialog,
  UsersFilterBar,
  UsersTable,
} from '@/features/users';
import type { User, UserTier } from '@/types/api';

const PAGE_SIZE = 20;

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

  const usersQuery = useUsers({
    page,
    pageSize: PAGE_SIZE,
    tier: selectedTier,
    deleted: parseDeletedFilter(deletedFilter),
  });

  const { data, isLoading, isError, error } = usersQuery;
  const setTierMutation = useSetUserTier();

  const users = data?.users || [];
  const totalPages = getTotalPages(data?.pagination.count || 0);
  const usersErrorMessage = error instanceof Error ? error.message : '用户列表加载失败';

  const handleOpenTierDialog = (user: User) => {
    setSelectedUser(user);
    setTierDialogOpen(true);
  };

  const handleTierDialogOpenChange = (open: boolean) => {
    setTierDialogOpen(open);
    if (!open) {
      setSelectedUser(null);
    }
  };

  const handleTierFilterChange = (value: string) => {
    setSelectedTier(value);
    resetPage();
  };

  const handleDeletedFilterChange = (value: string) => {
    setDeletedFilter(value);
    resetPage();
  };

  const handleSetTier = (tier: UserTier) => {
    if (!selectedUser) return;
    setTierMutation.mutate(
      { userId: selectedUser.id, tier },
      {
        onSuccess: () => {
          handleTierDialogOpenChange(false);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="用户管理" description="查看和管理所有用户信息" />

      {/* 筛选器 */}
      <UsersFilterBar
        selectedTier={selectedTier}
        deletedFilter={deletedFilter}
        onTierChange={handleTierFilterChange}
        onDeletedFilterChange={handleDeletedFilterChange}
      />

      {/* 用户列表 */}
      <UsersTable
        users={users}
        isLoading={isLoading}
        isError={isError}
        errorMessage={usersErrorMessage}
        onRetry={() => {
          void usersQuery.refetch();
        }}
        onOpenTierDialog={handleOpenTierDialog}
      />

      {/* 分页 */}
      {users.length > 0 && !isLoading && !isError && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* 设置等级对话框 */}
      {selectedUser && (
        <SetTierDialog
          open={tierDialogOpen}
          onOpenChange={handleTierDialogOpenChange}
          currentTier={selectedUser.subscriptionTier}
          onSubmit={handleSetTier}
          isLoading={setTierMutation.isPending}
        />
      )}
    </div>
  );
}
