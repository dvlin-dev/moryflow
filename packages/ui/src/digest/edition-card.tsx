/**
 * EditionCard - 期刊卡片组件
 *
 * [PROPS]: edition 数据, items
 * [POS]: 用于公开话题期刊列表展示
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/card';
import { cn } from '../lib/utils';

export interface EditionData {
  id: string;
  topicId: string;
  scheduledAt: Date;
  finishedAt: Date | null;
  outputLocale: string;
  narrativeMarkdown: string | null;
  itemCount: number;
}

export interface EditionItemData {
  id: string;
  rank: number;
  scoreOverall: number;
  titleSnapshot: string;
  urlSnapshot: string;
  aiSummarySnapshot: string | null;
  siteName: string | null;
  favicon: string | null;
}

export interface EditionCardProps {
  edition: EditionData;
  items?: EditionItemData[];
  showItems?: boolean;
  maxItems?: number;
  onView?: () => void;
  className?: string;
}

export function EditionCard({
  edition,
  items,
  showItems = false,
  maxItems = 5,
  onView,
  className,
}: EditionCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const displayItems = items?.slice(0, maxItems) ?? [];

  return (
    <Card
      className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
      onClick={onView}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{formatDate(edition.scheduledAt)}</CardTitle>
            <CardDescription>
              {edition.itemCount} items • {edition.outputLocale.toUpperCase()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {showItems && displayItems.length > 0 && (
        <CardContent className="space-y-2">
          {displayItems.map((item) => (
            <div key={item.id} className="flex items-start gap-2 text-sm">
              {item.favicon ? (
                <img
                  src={item.favicon}
                  alt=""
                  className="mt-0.5 h-4 w-4 rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="mt-0.5 h-4 w-4 rounded bg-muted" />
              )}
              <div className="flex-1 min-w-0">
                <a
                  href={item.urlSnapshot}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline line-clamp-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.titleSnapshot}
                </a>
                {item.siteName && (
                  <span className="text-xs text-muted-foreground">{item.siteName}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {item.scoreOverall}
              </span>
            </div>
          ))}
          {items && items.length > maxItems && (
            <p className="text-xs text-muted-foreground">+{items.length - maxItems} more items</p>
          )}
        </CardContent>
      )}

      {edition.narrativeMarkdown && !showItems && (
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">{edition.narrativeMarkdown}</p>
        </CardContent>
      )}
    </Card>
  );
}
