/**
 * [PROPS]: featured topic rows + actions
 * [EMITS]: reorder/remove/view actions
 * [POS]: Digest featured topics table
 */

import { ArrowUp, ChevronDown, Star, View } from 'lucide-react';
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
import type { Topic } from '../types';

export interface FeaturedTopicsTableProps {
  topics: Topic[];
  isReordering: boolean;
  isRemoving: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemoveFeatured: (topic: Topic) => void;
  onViewTopic: (slug: string) => void;
}

export function FeaturedTopicsTable({
  topics,
  isReordering,
  isRemoving,
  onMoveUp,
  onMoveDown,
  onRemoveFeatured,
  onViewTopic,
}: FeaturedTopicsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Order</TableHead>
          <TableHead>Topic</TableHead>
          <TableHead>Subscribers</TableHead>
          <TableHead>Featured At</TableHead>
          <TableHead>Featured By</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {topics.map((topic, index) => (
          <TableRow key={topic.id}>
            <TableCell>
              <Badge variant="outline">#{index + 1}</Badge>
            </TableCell>
            <TableCell>
              <div>
                <p className="font-medium">{topic.title}</p>
                <p className="text-sm text-muted-foreground">/{topic.slug}</p>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm">{topic.subscriberCount}</span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {topic.featuredAt ? formatRelativeTime(topic.featuredAt) : '-'}
            </TableCell>
            <TableCell className="text-sm">
              {topic.featuredBy?.name || topic.featuredBy?.email || '-'}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onMoveUp(index)}
                  disabled={index === 0 || isReordering}
                  title="Move Up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onMoveDown(index)}
                  disabled={index === topics.length - 1 || isReordering}
                  title="Move Down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewTopic(topic.slug)}
                  title="View Topic"
                >
                  <View className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onRemoveFeatured(topic)}
                  disabled={isRemoving}
                  title="Remove from Featured"
                >
                  <Star className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
