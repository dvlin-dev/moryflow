/**
 * [PROPS]: item, isSelected, onClick
 * [POS]: Article card in the list with title, summary, and metadata
 */

import { Badge, cn } from '@aiget/ui';
import { formatRelativeTime } from '@/lib/date';
import type { InboxItem } from '@/features/digest/types';

interface ArticleCardProps {
  item: InboxItem;
  isSelected: boolean;
  onClick: () => void;
}

export function ArticleCard({ item, isSelected, onClick }: ArticleCardProps) {
  const isUnread = !item.readAt;
  const isSaved = !!item.savedAt;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-md border p-3 text-left transition-colors',
        isSelected
          ? 'border-primary/50 bg-accent'
          : 'border-border hover:border-border hover:bg-accent/50',
        isUnread && !isSelected && 'border-l-2 border-l-primary'
      )}
    >
      {/* Title */}
      <h3
        className={cn(
          'mb-1 line-clamp-2 text-sm',
          isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
        )}
      >
        {item.titleSnapshot}
      </h3>

      {/* AI Summary preview */}
      {item.aiSummarySnapshot && (
        <div className="mb-2 rounded bg-muted/50 p-2">
          <div className="mb-1 flex items-center gap-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">
              AI Summary
            </span>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">{item.aiSummarySnapshot}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {item.siteName && <span className="truncate">{item.siteName}</span>}
        {item.siteName && <span>·</span>}
        <span>{formatRelativeTime(item.deliveredAt)}</span>
        {isSaved && (
          <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">
            Saved
          </Badge>
        )}
      </div>
    </button>
  );
}
