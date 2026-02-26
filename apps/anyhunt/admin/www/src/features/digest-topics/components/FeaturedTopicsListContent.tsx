/**
 * [PROPS]: viewModel/actions（精选状态 + 排序/移除/查看动作）
 * [EMITS]: reorder/remove/view actions
 * [POS]: Digest featured list state dispatcher
 */

import { Card, CardContent, CardHeader, CardTitle } from '@moryflow/ui';
import { ListEmptyState, ListErrorState, ListLoadingRows } from '@/components/list-state';
import type { Topic } from '../types';
import type { FeaturedTopicsListState } from '../list-states';
import { FeaturedTopicsTable } from './FeaturedTopicsTable';

export interface FeaturedTopicsListContentViewModel {
  state: FeaturedTopicsListState;
  topics: Topic[] | undefined;
  error: unknown;
  isReordering: boolean;
  isRemoving: boolean;
}

export interface FeaturedTopicsListContentActions {
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemoveFeatured: (topic: Topic) => void;
  onViewTopic: (slug: string) => void;
}

export interface FeaturedTopicsListContentProps {
  viewModel: FeaturedTopicsListContentViewModel;
  actions: FeaturedTopicsListContentActions;
}

export function FeaturedTopicsListContent({ viewModel, actions }: FeaturedTopicsListContentProps) {
  const { state, topics, error, isReordering, isRemoving } = viewModel;
  const { onMoveUp, onMoveDown, onRemoveFeatured, onViewTopic } = actions;
  const renderContentByState = () => {
    switch (state) {
      case 'loading':
        return <ListLoadingRows rows={5} />;
      case 'error':
        return (
          <ListErrorState
            message={error instanceof Error ? error.message : 'Failed to load featured topics'}
          />
        );
      case 'empty':
        return <ListEmptyState message="No featured topics. Add topics from the All Topics tab." />;
      case 'ready':
        return (
          <FeaturedTopicsTable
            topics={topics ?? []}
            isReordering={isReordering}
            isRemoving={isRemoving}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onRemoveFeatured={onRemoveFeatured}
            onViewTopic={onViewTopic}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Featured Topics Order</CardTitle>
      </CardHeader>
      <CardContent>{renderContentByState()}</CardContent>
    </Card>
  );
}
