/**
 * [PROPS]: Discover feed list model
 * [POS]: Reader 中栏 - Discover 列表（纯渲染）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import type { DiscoverFeedItem, DiscoverFeedType } from '@/features/discover/types';
import { DiscoverFeedList } from '@/components/reader/DiscoverFeedList';

interface DiscoverListPaneProps {
  items: DiscoverFeedItem[];
  selectedId: string | null;
  feedType: DiscoverFeedType;
  isLoading: boolean;
  isRefreshing: boolean;
  onSelect: (item: DiscoverFeedItem) => void;
  onFeedTypeChange: (feedType: DiscoverFeedType) => void;
  onRefresh: () => void;
}

export function DiscoverListPane({
  items,
  selectedId,
  onSelect,
  feedType,
  onFeedTypeChange,
  onRefresh,
  isLoading,
  isRefreshing,
}: DiscoverListPaneProps) {
  return (
    <DiscoverFeedList
      items={items}
      selectedId={selectedId}
      onSelect={onSelect}
      feedType={feedType}
      onFeedTypeChange={onFeedTypeChange}
      onRefresh={onRefresh}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
    />
  );
}
