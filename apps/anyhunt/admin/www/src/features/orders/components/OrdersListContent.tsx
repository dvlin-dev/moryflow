/**
 * [PROPS]: 列表状态、订单分页数据与页码回调
 * [EMITS]: onPageChange(page)
 * [POS]: orders 列表内容状态分发组件
 */

import { ListEmptyState, ListLoadingRows } from '@/components/list-state';
import type { OrderListItem, PaginatedResponse } from '../types';
import { OrdersTable } from './OrdersTable';

export type OrdersContentState = 'loading' | 'empty' | 'ready';

export interface OrdersListContentProps {
  state: OrdersContentState;
  data: PaginatedResponse<OrderListItem> | undefined;
  onPageChange: (page: number) => void;
}

export function OrdersListContent({ state, data, onPageChange }: OrdersListContentProps) {
  switch (state) {
    case 'loading':
      return <ListLoadingRows />;
    case 'empty':
      return <ListEmptyState message="没有找到订单" />;
    case 'ready':
      if (!data) {
        return null;
      }

      return (
        <OrdersTable items={data.items} pagination={data.pagination} onPageChange={onPageChange} />
      );
    default:
      return null;
  }
}
