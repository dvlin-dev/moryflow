/**
 * InboxItem - 收件箱条目组件
 *
 * [PROPS]: item 数据, onMarkRead, onSave, onNotInterested
 * [POS]: 用于 Console Inbox 列表展示
 */

import { Card, CardContent } from '../components/card';
import { Button } from '../components/button';
import { ScoreBadge } from './score-badge';
import { cn } from '../lib/utils';

export interface InboxItemData {
  id: string;
  subscriptionName: string;
  titleSnapshot: string;
  urlSnapshot: string;
  aiSummarySnapshot: string | null;
  siteName: string | null;
  favicon: string | null;
  scoreRelevance: number;
  scoreOverall: number;
  rank: number;
  deliveredAt: Date | null;
  readAt: Date | null;
  savedAt: Date | null;
  notInterestedAt: Date | null;
}

export interface InboxItemProps {
  item: InboxItemData;
  onMarkRead?: () => void;
  onMarkUnread?: () => void;
  onSave?: () => void;
  onUnsave?: () => void;
  onNotInterested?: () => void;
  onUndoNotInterested?: () => void;
  className?: string;
  isLoading?: boolean;
}

export function InboxItem({
  item,
  onMarkRead,
  onMarkUnread,
  onSave,
  onUnsave,
  onNotInterested,
  onUndoNotInterested,
  className,
  isLoading,
}: InboxItemProps) {
  const isRead = !!item.readAt;
  const isSaved = !!item.savedAt;
  const isNotInterested = !!item.notInterestedAt;

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card
      className={cn(
        'relative transition-opacity',
        !isRead && 'border-l-4 border-l-primary',
        isNotInterested && 'opacity-50',
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Favicon */}
          {item.favicon ? (
            <img
              src={item.favicon}
              alt=""
              className="mt-1 h-5 w-5 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="mt-1 h-5 w-5 rounded bg-muted" />
          )}

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <a
                  href={item.urlSnapshot}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'font-medium hover:underline',
                    isRead ? 'text-muted-foreground' : 'text-foreground'
                  )}
                  onClick={() => !isRead && onMarkRead?.()}
                >
                  {item.titleSnapshot}
                </a>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {item.siteName && <span>{item.siteName}</span>}
                  <span>#{item.rank}</span>
                  <span>{item.subscriptionName}</span>
                  {item.deliveredAt && <span>{formatDate(item.deliveredAt)}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <ScoreBadge score={item.scoreRelevance} variant="relevance" />
                <ScoreBadge score={item.scoreOverall} variant="overall" />
              </div>
            </div>

            {item.aiSummarySnapshot && (
              <p className="text-sm text-muted-foreground line-clamp-2">{item.aiSummarySnapshot}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {isRead ? (
                <Button variant="ghost" size="sm" onClick={onMarkUnread} disabled={isLoading}>
                  Mark Unread
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={onMarkRead} disabled={isLoading}>
                  Mark Read
                </Button>
              )}

              {isSaved ? (
                <Button variant="ghost" size="sm" onClick={onUnsave} disabled={isLoading}>
                  Unsave
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={onSave} disabled={isLoading}>
                  Save
                </Button>
              )}

              {isNotInterested ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndoNotInterested}
                  disabled={isLoading}
                >
                  Undo Not Interested
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNotInterested}
                  disabled={isLoading}
                  className="text-muted-foreground"
                >
                  Not Interested
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
