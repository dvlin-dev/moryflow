/**
 * [PROPS]: 用户数据、分页信息与行级操作回调
 * [EMITS]: onToggleAdmin/onGrantCredits/onDelete/onPageChange
 * [POS]: users 列表表格展示组件
 */

import { Coins, Delete, Ellipsis, Shield } from 'lucide-react';
import { SimplePagination } from '@moryflow/ui';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@moryflow/ui';
import { formatRelativeTime } from '@moryflow/ui/lib';
import type { Pagination, UserListItem } from '../types';
import { getUserTierBadgeVariant } from '../constants';

export interface UsersTableProps {
  items: UserListItem[];
  pagination: Pagination;
  onToggleAdmin: (user: UserListItem) => void;
  onGrantCredits: (user: UserListItem) => void;
  onDelete: (user: UserListItem) => void;
  onPageChange: (page: number) => void;
}

function renderQuotaCell(user: UserListItem): React.ReactNode {
  if (!user.quota) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <span className="text-sm">
      {user.quota.monthlyUsed} / {user.quota.monthlyLimit}
      {user.quota.purchasedQuota > 0 && (
        <span className="text-muted-foreground"> (+{user.quota.purchasedQuota})</span>
      )}
    </span>
  );
}

export function UsersTable({
  items,
  pagination,
  onToggleAdmin,
  onGrantCredits,
  onDelete,
  onPageChange,
}: UsersTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>用户</TableHead>
            <TableHead>订阅</TableHead>
            <TableHead>配额</TableHead>
            <TableHead>截图数</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>注册时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((user) => (
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
                <Badge variant={getUserTierBadgeVariant(user.subscriptionTier)}>
                  {user.subscriptionTier}
                </Badge>
                {user.subscriptionStatus && user.subscriptionStatus !== 'ACTIVE' && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {user.subscriptionStatus}
                  </Badge>
                )}
              </TableCell>
              <TableCell>{renderQuotaCell(user)}</TableCell>
              <TableCell>{user.screenshotCount}</TableCell>
              <TableCell>
                <Switch checked={user.isAdmin} onCheckedChange={() => onToggleAdmin(user)} />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatRelativeTime(user.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Ellipsis className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onToggleAdmin(user)}>
                      <Shield className="h-4 w-4 mr-2" />
                      {user.isAdmin ? '移除管理员' : '设为管理员'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onGrantCredits(user)}>
                      <Coins className="h-4 w-4 mr-2" />
                      Grant credits
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(user)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Delete className="h-4 w-4 mr-2" />
                      删除用户
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <SimplePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </>
  );
}
