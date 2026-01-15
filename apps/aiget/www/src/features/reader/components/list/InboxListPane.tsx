/**
 * [PROPS]: Inbox list model
 * [POS]: Reader 中栏 - Inbox 列表（纯渲染）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import type { InboxItem } from '@/features/digest/types';
import { ArticleList } from '@/components/reader/ArticleList';
import type { FilterState } from '../../reader.types';

interface InboxListPaneProps {
  items: InboxItem[];
  selectedId: string | null;
  title: string;
  filter: FilterState;
  isLoading: boolean;
  isRefreshing: boolean;
  onSelect: (item: InboxItem) => void;
  onFilterChange: (filter: FilterState) => void;
  onRefresh: () => void;
  onMarkAllRead: () => void;
}

export function InboxListPane({
  items,
  selectedId,
  onSelect,
  title,
  filter,
  onFilterChange,
  onRefresh,
  onMarkAllRead,
  isLoading,
  isRefreshing,
}: InboxListPaneProps) {
  return (
    <ArticleList
      items={items}
      selectedId={selectedId}
      onSelect={onSelect}
      title={title}
      filter={filter}
      onFilterChange={onFilterChange}
      onRefresh={onRefresh}
      onMarkAllRead={onMarkAllRead}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
    />
  );
}
