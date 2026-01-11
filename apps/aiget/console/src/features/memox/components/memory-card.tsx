/**
 * Memory 卡片组件 - 用于 Memories 列表页
 */

import { Calendar03Icon, Tag01Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, Icon, Badge } from '@aiget/ui';
import type { Memory } from '../types';

interface MemoryListCardProps {
  memory: Memory;
}

export function MemoryListCard({ memory }: MemoryListCardProps) {
  const createdAt = new Date(memory.createdAt).toLocaleString();

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Content */}
          <p className="text-sm whitespace-pre-wrap line-clamp-4">{memory.content}</p>

          {/* Tags */}
          {memory.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Icon icon={Tag01Icon} className="h-3.5 w-3.5 text-muted-foreground" />
              {memory.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Icon icon={Calendar03Icon} className="h-3.5 w-3.5" />
              <span>{createdAt}</span>
            </div>
            {memory.importance !== null && (
              <span>Importance: {(memory.importance * 100).toFixed(0)}%</span>
            )}
            {memory.source && <span>Source: {memory.source}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
