/**
 * [PROPS]: item, isSelected, onClick
 * [POS]: Feed card in the discover list with title, summary, and topic info
 */

import { Badge, cn } from '@anyhunt/ui';
import { formatRelativeTime } from '@/lib/date';
import type { DiscoverFeedItem } from '@/features/discover/types';

interface DiscoverFeedCardProps {
  item: DiscoverFeedItem;
  isSelected: boolean;
  onClick: () => void;
}

export function DiscoverFeedCard({ item, isSelected, onClick }: DiscoverFeedCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-md border p-3 text-left transition-colors',
        isSelected
          ? 'border-primary/50 bg-accent'
          : 'border-border hover:border-border hover:bg-accent/50'
      )}
    >
      {/* Title */}
      <h3 className={cn('mb-1 line-clamp-2 text-sm', 'font-semibold text-foreground')}>
        {item.title}
      </h3>

      {/* AI Summary preview */}
      {item.aiSummary && (
        <div className="mb-2 rounded bg-muted/50 p-2">
          <div className="mb-1 flex items-center gap-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">
              AI Summary
            </span>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">{item.aiSummary}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {item.siteName && <span className="truncate">{item.siteName}</span>}
        {item.siteName && <span>·</span>}
        <span>{formatRelativeTime(item.editionAt)}</span>
        <Badge variant="outline" className="ml-auto h-4 px-1.5 text-[10px]">
          {item.topic.title}
        </Badge>
      </div>
    </button>
  );
}
