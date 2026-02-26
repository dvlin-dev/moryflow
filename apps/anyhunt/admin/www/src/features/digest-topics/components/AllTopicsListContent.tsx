/**
 * [PROPS]: topics list state/data/filter/actions
 * [EMITS]: query filter + row actions
 * [POS]: Digest topics all-list state dispatcher
 */

import { type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SimplePagination,
} from '@moryflow/ui';
import { ListEmptyState, ListErrorState, ListLoadingRows } from '@/components/list-state';
import {
  TOPIC_STATUS_OPTIONS,
  TOPIC_VISIBILITY_OPTIONS,
  topicStatusConfig,
  topicVisibilityConfig,
} from '../constants';
import type { Topic, TopicListResponse, TopicQuery } from '../types';
import type { AllTopicsListState } from '../list-states';
import { AllTopicsTable } from './AllTopicsTable';

export interface AllTopicsListContentProps {
  state: AllTopicsListState;
  data: TopicListResponse | undefined;
  error: unknown;
  query: TopicQuery;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPageChange: (page: number) => void;
  onFilterVisibility: (visibility: string) => void;
  onFilterStatus: (status: string) => void;
  onToggleFeatured: (topic: Topic) => void;
  onViewTopic: (slug: string) => void;
  isToggling: boolean;
}

export function AllTopicsListContent({
  state,
  data,
  error,
  query,
  searchInput,
  onSearchInputChange,
  onSearch,
  onSearchKeyDown,
  onPageChange,
  onFilterVisibility,
  onFilterStatus,
  onToggleFeatured,
  onViewTopic,
  isToggling,
}: AllTopicsListContentProps) {
  const renderContentByState = () => {
    switch (state) {
      case 'loading':
        return <ListLoadingRows rows={5} />;
      case 'error':
        return (
          <ListErrorState
            message={error instanceof Error ? error.message : 'Failed to load digest topics'}
          />
        );
      case 'empty':
        return <ListEmptyState message="No topics found" />;
      case 'ready':
        if (!data) {
          return null;
        }

        return (
          <>
            <AllTopicsTable
              items={data.items}
              isToggling={isToggling}
              onToggleFeatured={onToggleFeatured}
              onViewTopic={onViewTopic}
            />
            {data.totalPages > 1 ? (
              <div className="mt-4 flex justify-center">
                <SimplePagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={onPageChange}
                />
              </div>
            ) : null}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Topic List</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={query.visibility || 'all'} onValueChange={onFilterVisibility}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visibility</SelectItem>
                {TOPIC_VISIBILITY_OPTIONS.map((visibility) => (
                  <SelectItem key={visibility} value={visibility}>
                    {topicVisibilityConfig[visibility].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={query.status || 'all'} onValueChange={onFilterStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {TOPIC_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {topicStatusConfig[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search..."
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
              onKeyDown={onSearchKeyDown}
              className="w-40"
            />
            <Button variant="outline" size="icon" onClick={onSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderContentByState()}</CardContent>
    </Card>
  );
}
