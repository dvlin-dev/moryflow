/**
 * [PROPS]: memory
 * [EMITS]: none
 * [POS]: Memory 卡片组件 - 用于 Memories 列表页（Lucide icons direct render）
 */

import { Calendar, Tag } from 'lucide-react';
import { Card, CardContent, Badge } from '@moryflow/ui';
import type { Memory } from '../types';

interface MemoryListCardProps {
  memory: Memory;
}

export function MemoryListCard({ memory }: MemoryListCardProps) {
  const createdAt = new Date(memory.created_at).toLocaleString();
  const categories = memory.categories ?? [];
  const keywords = memory.keywords ?? [];

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Content */}
          <p className="text-sm whitespace-pre-wrap line-clamp-4">{memory.memory}</p>

          {/* Tags */}
          {(categories.length > 0 || keywords.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              {categories.map((category) => (
                <Badge key={category} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
              {keywords.map((keyword) => (
                <Badge key={keyword} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{createdAt}</span>
            </div>
            {memory.user_id && <span>User: {memory.user_id}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
