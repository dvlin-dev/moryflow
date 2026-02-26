/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Users 页面 - 用户管理（Lucide icons direct render）
 */
import { useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '@moryflow/ui';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@moryflow/ui';
import {
  useDeleteUser,
  UserCreditsSheet,
  UserDeleteDialog,
  UsersListContent,
  type UsersContentState,
  useUpdateUser,
  useUsers,
} from '@/features/users';
import type { UserListItem, UserQuery } from '@/features/users';
import { usePagedSearchQuery } from '@/lib/usePagedSearchQuery';

function resolveUsersContentState(params: {
  isLoading: boolean;
  itemCount: number;
}): UsersContentState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.itemCount > 0) {
    return 'ready';
  }

  return 'empty';
}

export default function UsersPage() {
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserListItem | null>(null);
  const [creditsTargetUserId, setCreditsTargetUserId] = useState<string | null>(null);

  const {
    query,
    searchInput,
    setSearchInput,
    handleSearch,
    handleSearchKeyDown,
    handlePageChange,
  } = usePagedSearchQuery<UserQuery>({
    initialQuery: { page: 1, limit: 20 },
  });

  const { data, isLoading } = useUsers(query);
  const { mutate: updateUser } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  const handleToggleAdmin = (user: UserListItem) => {
    updateUser({
      id: user.id,
      data: { isAdmin: !user.isAdmin },
    });
  };

  const handleDelete = (user: UserListItem) => {
    setDeleteTargetUser(user);
  };

  const handleGrantCredits = (user: UserListItem) => {
    setCreditsTargetUserId(user.id);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetUser) {
      return;
    }

    deleteUser(deleteTargetUser.id, {
      onSuccess: () => setDeleteTargetUser(null),
    });
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDeleteTargetUser(null);
    }
  };

  const handleCreditsSheetOpenChange = (open: boolean) => {
    if (!open) {
      setCreditsTargetUserId(null);
    }
  };

  const usersContentState = resolveUsersContentState({
    isLoading,
    itemCount: data?.items.length ?? 0,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="管理系统用户" />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>用户列表</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="搜索邮箱或名称..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-64"
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UsersListContent
            state={usersContentState}
            data={data}
            onToggleAdmin={handleToggleAdmin}
            onGrantCredits={handleGrantCredits}
            onDelete={handleDelete}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>

      <UserDeleteDialog
        open={deleteTargetUser !== null}
        user={deleteTargetUser}
        isDeleting={isDeleting}
        onOpenChange={handleDeleteDialogOpenChange}
        onConfirm={handleConfirmDelete}
      />

      <UserCreditsSheet
        open={creditsTargetUserId !== null}
        onOpenChange={handleCreditsSheetOpenChange}
        userId={creditsTargetUserId}
      />
    </div>
  );
}
