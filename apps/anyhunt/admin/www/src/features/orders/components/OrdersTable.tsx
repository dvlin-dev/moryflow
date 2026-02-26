/**
 * [PROPS]: 订单数据、分页信息与页码回调
 * [EMITS]: onPageChange(page)
 * [POS]: orders 列表表格展示组件
 */

import { SimplePagination } from '@moryflow/ui';
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@moryflow/ui';
import { formatRelativeTime } from '@moryflow/ui/lib';
import type { OrderListItem, Pagination } from '../types';
import {
  getOrderStatusBadgeVariant,
  getOrderTypeBadgeVariant,
  getOrderTypeLabel,
} from '../constants';
import { formatOrderAmount } from '../formatters';

export interface OrdersTableProps {
  items: OrderListItem[];
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

export function OrdersTable({ items, pagination, onPageChange }: OrdersTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>订单号</TableHead>
            <TableHead>用户</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>金额</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>配额数量</TableHead>
            <TableHead>创建时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <span className="font-mono text-sm">{order.creemOrderId}</span>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{order.userName || '未设置'}</p>
                  <p className="text-sm text-muted-foreground">{order.userEmail || '-'}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getOrderTypeBadgeVariant(order.type)}>
                  {getOrderTypeLabel(order.type)}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {formatOrderAmount(order.amount, order.currency)}
              </TableCell>
              <TableCell>
                <Badge variant={getOrderStatusBadgeVariant(order.status)}>{order.status}</Badge>
              </TableCell>
              <TableCell>
                {order.quotaAmount ? (
                  <span>{order.quotaAmount}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatRelativeTime(order.createdAt)}
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
