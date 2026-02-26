/**
 * [PROPS]: 订阅列表数据、分页信息与编辑回调
 * [EMITS]: onEdit(subscription), onPageChange(page)
 * [POS]: subscriptions 列表展示组件（纯展示，不处理请求编排）
 */

import { Pencil } from 'lucide-react';
import { SimplePagination } from '@moryflow/ui';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@moryflow/ui';
import { formatRelativeTime } from '@moryflow/ui/lib';
import type { Pagination, SubscriptionListItem } from '../types';
import { getSubscriptionStatusBadgeVariant, getSubscriptionTierBadgeVariant } from '../constants';

export interface SubscriptionsTableProps {
  items: SubscriptionListItem[];
  pagination: Pagination;
  onEdit: (subscription: SubscriptionListItem) => void;
  onPageChange: (page: number) => void;
}

function renderCurrentPeriod(subscription: SubscriptionListItem): React.ReactNode {
  if (!subscription.currentPeriodEnd) {
    return <span className="text-muted-foreground">永久</span>;
  }

  return (
    <span>
      {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{' '}
      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
    </span>
  );
}

export function SubscriptionsTable({
  items,
  pagination,
  onEdit,
  onPageChange,
}: SubscriptionsTableProps) {
  return (
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
          {items.map((subscription) => (
            <TableRow key={subscription.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{subscription.userName || '未设置'}</p>
                  <p className="text-sm text-muted-foreground">{subscription.userEmail}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getSubscriptionTierBadgeVariant(subscription.tier)}>
                  {subscription.tier}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getSubscriptionStatusBadgeVariant(subscription.status)}>
                  {subscription.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{renderCurrentPeriod(subscription)}</TableCell>
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
                <Button variant="ghost" size="icon" onClick={() => onEdit(subscription)}>
                  <Pencil className="h-4 w-4" />
                </Button>
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
