/**
 * [PROPS]: 列表状态、用户分页数据与操作回调
 * [EMITS]: onToggleAdmin/onGrantCredits/onDelete/onPageChange
 * [POS]: users 列表内容状态分发组件
 */

import { ListEmptyState, ListLoadingRows } from '@/components/list-state';
import type { PaginatedResponse, UserListItem } from '../types';
import { UsersTable } from './UsersTable';

export type UsersContentState = 'loading' | 'empty' | 'ready';

export interface UsersListContentProps {
  state: UsersContentState;
  data: PaginatedResponse<UserListItem> | undefined;
  onToggleAdmin: (user: UserListItem) => void;
  onGrantCredits: (user: UserListItem) => void;
  onDelete: (user: UserListItem) => void;
  onPageChange: (page: number) => void;
}

export function UsersListContent({
  state,
  data,
  onToggleAdmin,
  onGrantCredits,
  onDelete,
  onPageChange,
}: UsersListContentProps) {
  switch (state) {
    case 'loading':
      return <ListLoadingRows />;
    case 'empty':
      return <ListEmptyState message="没有找到用户" />;
    case 'ready':
      if (!data) {
        return null;
      }

      return (
        <UsersTable
          items={data.items}
          pagination={data.pagination}
          onToggleAdmin={onToggleAdmin}
          onGrantCredits={onGrantCredits}
          onDelete={onDelete}
          onPageChange={onPageChange}
        />
      );
    default:
      return null;
  }
}
