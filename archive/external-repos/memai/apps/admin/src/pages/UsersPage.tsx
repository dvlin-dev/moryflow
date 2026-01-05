/**
 * Users 页面
 * 用户管理
 */
import { useState } from 'react';
import { PageHeader, SimplePagination } from '@memai/ui/composed';
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
  Switch,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@memai/ui/primitives';
import { formatRelativeTime } from '@memai/ui/lib';
import { Search, MoreHorizontal, Shield, Trash2 } from 'lucide-react';
import { useUsers, useUpdateUser, useDeleteUser } from '@/features/users';
import type { UserListItem, UserQuery } from '@/features/users';
import { getTierBadgeVariant } from '@/lib/badge-variants';

const DEFAULT_LIMIT = 20;

export default function UsersPage() {
  const [query, setQuery] = useState<UserQuery>({ offset: 0, limit: DEFAULT_LIMIT });
  const [searchInput, setSearchInput] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);

  const { data, isLoading } = useUsers(query);
  const { mutate: updateUser } = useUpdateUser();
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  // 计算当前页码和总页数
  const currentPage = Math.floor((query.offset ?? 0) / DEFAULT_LIMIT) + 1;
  const totalPages = data ? Math.ceil(data.pagination.total / DEFAULT_LIMIT) : 1;

  const handleSearch = () => {
    setQuery((prev) => ({ ...prev, offset: 0, search: searchInput || undefined }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (page: number) => {
    setQuery((prev) => ({ ...prev, offset: (page - 1) * DEFAULT_LIMIT }));
  };

  const handleToggleAdmin = (user: UserListItem) => {
    updateUser({
      id: user.id,
      data: { isAdmin: !user.isAdmin },
    });
  };

  const handleDelete = (user: UserListItem) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedUser) {
      deleteUser(selectedUser.id, {
        onSuccess: () => setDeleteDialogOpen(false),
      });
    }
  };

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
                onKeyDown={handleKeyDown}
                className="w-64"
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
              <p className="text-muted-foreground">没有找到用户</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>订阅</TableHead>
                    <TableHead>配额</TableHead>
                    <TableHead>Memories</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {user.name || '未设置'}
                            {user.isAdmin && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Admin
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTierBadgeVariant(user.tier)}>
                          {user.tier}
                        </Badge>
                        {user.subscriptionStatus && user.subscriptionStatus !== 'ACTIVE' && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {user.subscriptionStatus}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.quota ? (
                          <span className="text-sm">
                            {user.quota.monthlyUsed} / {user.quota.monthlyLimit}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>{user.memoryCount}</TableCell>
                      <TableCell>
                        <Switch
                          checked={user.isAdmin}
                          onCheckedChange={() => handleToggleAdmin(user)}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatRelativeTime(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleToggleAdmin(user)}>
                              <Shield className="h-4 w-4 mr-2" />
                              {user.isAdmin ? '移除管理员' : '设为管理员'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(user)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除用户
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <SimplePagination
                    page={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将软删除用户 <strong>{selectedUser?.email}</strong>
              ，用户将无法登录，但数据会保留。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
