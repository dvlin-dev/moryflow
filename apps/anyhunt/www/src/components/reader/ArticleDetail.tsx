/**
 * [PROPS]: item, onSave, onNotInterested, fullContent, isLoadingContent
 * [POS]: Right column article detail with actions and content
 */

import { lazy, Suspense } from 'react';
import {
  ScrollArea,
  Button,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Icon,
} from '@anyhunt/ui';
import { StarIcon, ThumbsDownIcon, SquareArrowUpRightIcon } from '@hugeicons/core-free-icons';
import { AISummaryCard } from './AISummaryCard';
import { formatDate } from '@/lib/date';
import type { InboxItem } from '@/features/digest/types';

const LazyMarkdownView = lazy(() =>
  import('./MarkdownView').then((m) => ({ default: m.MarkdownView }))
);

interface ArticleDetailProps {
  /** The article to display */
  item: InboxItem | null;
  /** Callback when saving/unsaving */
  onSave: (item: InboxItem) => void;
  /** Callback when marking as not interested */
  onNotInterested: (item: InboxItem) => void;
  /** Full article content (markdown) */
  fullContent: string | null;
  /** Loading state for content */
  isLoadingContent?: boolean;
  /** Is save action pending */
  isSaving?: boolean;
}

export function ArticleDetail({
  item,
  onSave,
  onNotInterested,
  fullContent,
  isLoadingContent,
  isSaving,
}: ArticleDetailProps) {
  if (!item) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Select an article to read</p>
      </div>
    );
  }

  const isSaved = !!item.savedAt;

  function renderFullContent(originalUrl: string) {
    if (isLoadingContent) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      );
    }

    if (fullContent) {
      return (
        <div className="article-content">
          <Suspense
            fallback={
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            }
          >
            <LazyMarkdownView markdown={fullContent} />
          </Suspense>
        </div>
      );
    }

    return (
      <p className="text-muted-foreground">
        Content not available.{' '}
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          View original article
        </a>
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with actions */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <h1 className="truncate text-sm font-semibold">{item.titleSnapshot}</h1>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            {/* Save button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => onSave(item)}
                  disabled={isSaving}
                >
                  <Icon
                    icon={StarIcon}
                    className={`size-4 ${isSaved ? 'fill-yellow-500 text-yellow-500' : ''}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isSaved ? 'Unsave' : 'Save'}</TooltipContent>
            </Tooltip>

            {/* Not interested button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => onNotInterested(item)}
                >
                  <Icon icon={ThumbsDownIcon} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Not Interested</TooltipContent>
            </Tooltip>

            {/* Open original link */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" asChild>
                  <a href={item.urlSnapshot} target="_blank" rel="noopener noreferrer">
                    <Icon icon={SquareArrowUpRightIcon} className="size-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open Original</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <article className="p-6">
          {/* Metadata */}
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            {item.siteName && (
              <>
                <span>{item.siteName}</span>
                <span>·</span>
              </>
            )}
            <span>{formatDate(item.deliveredAt)}</span>
          </div>

          {/* AI Summary */}
          {item.aiSummarySnapshot && <AISummaryCard summary={item.aiSummarySnapshot} />}

          {/* Full content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {renderFullContent(item.urlSnapshot)}
          </div>
        </article>
      </ScrollArea>
    </div>
  );
}
