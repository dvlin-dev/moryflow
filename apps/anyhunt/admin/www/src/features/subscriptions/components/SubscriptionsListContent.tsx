/**
 * [PROPS]: 列表状态、数据与回调
 * [EMITS]: onEdit(subscription), onPageChange(page)
 * [POS]: subscriptions 列表区域状态分发组件（loading/empty/ready）
 */

import { ListEmptyState, ListLoadingRows } from '@/components/list-state';
import type { PaginatedResponse, SubscriptionListItem } from '../types';
import { SubscriptionsTable } from './SubscriptionsTable';

export type SubscriptionsContentState = 'loading' | 'empty' | 'ready';

export interface SubscriptionsListContentProps {
  state: SubscriptionsContentState;
  data: PaginatedResponse<SubscriptionListItem> | undefined;
  onEdit: (subscription: SubscriptionListItem) => void;
  onPageChange: (page: number) => void;
}

export function SubscriptionsListContent({
  state,
  data,
  onEdit,
  onPageChange,
}: SubscriptionsListContentProps) {
  switch (state) {
    case 'loading':
      return <ListLoadingRows />;
    case 'empty':
      return <ListEmptyState message="没有找到订阅" />;
    case 'ready':
      if (!data) {
        return null;
      }

      return (
        <SubscriptionsTable
          items={data.items}
          pagination={data.pagination}
          onEdit={onEdit}
          onPageChange={onPageChange}
        />
      );
    default:
      return null;
  }
}
