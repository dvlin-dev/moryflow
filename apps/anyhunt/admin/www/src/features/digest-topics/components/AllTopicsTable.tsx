/**
 * [PROPS]: topic rows + actions
 * [EMITS]: onViewTopic / onToggleFeatured
 * [POS]: Digest topics all-list table
 */

import { Star, View } from 'lucide-react';
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
import type { Topic } from '../types';
import { topicStatusConfig, topicVisibilityConfig } from '../constants';

export interface AllTopicsTableProps {
  items: Topic[];
  isToggling: boolean;
  onToggleFeatured: (topic: Topic) => void;
  onViewTopic: (slug: string) => void;
}

export function AllTopicsTable({
  items,
  isToggling,
  onToggleFeatured,
  onViewTopic,
}: AllTopicsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Topic</TableHead>
          <TableHead>Creator</TableHead>
          <TableHead>Visibility</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Subscribers</TableHead>
          <TableHead>Featured</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((topic) => (
          <TableRow key={topic.id}>
            <TableCell>
              <div>
                <p className="font-medium">{topic.title}</p>
                <p className="text-sm text-muted-foreground">/{topic.slug}</p>
              </div>
            </TableCell>
            <TableCell>
              <div className="text-sm">
                <p>{topic.createdBy?.name || 'Unknown'}</p>
                <p className="text-muted-foreground">{topic.createdBy?.email}</p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={topicVisibilityConfig[topic.visibility].variant}>
                {topicVisibilityConfig[topic.visibility].label}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={topicStatusConfig[topic.status].variant}>
                {topicStatusConfig[topic.status].label}
              </Badge>
            </TableCell>
            <TableCell>
              <span className="text-sm">{topic.subscriberCount}</span>
            </TableCell>
            <TableCell>
              {topic.featured ? (
                <Badge variant="default" className="gap-1">
                  <Star className="h-3 w-3" />#{(topic.featuredOrder ?? 0) + 1}
                </Badge>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewTopic(topic.slug)}
                  title="View Topic"
                >
                  <View className="h-4 w-4" />
                </Button>
                <Button
                  variant={topic.featured ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => onToggleFeatured(topic)}
                  disabled={isToggling}
                  title={topic.featured ? 'Remove from Featured' : 'Add to Featured'}
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
