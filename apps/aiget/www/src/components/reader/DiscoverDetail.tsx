/**
 * [PROPS]: item
 * [POS]: Right column discover detail with summary and link to full content
 */

import { Link } from '@tanstack/react-router';
import {
  ScrollArea,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Icon,
  Card,
  CardContent,
} from '@aiget/ui';
import { SquareArrowUpRightIcon, UserMultiple02Icon, EyeIcon } from '@hugeicons/core-free-icons';
import { AISummaryCard } from './AISummaryCard';
import { formatDate } from '@/lib/date';
import type { DiscoverFeedItem } from '@/features/discover/types';

interface DiscoverDetailProps {
  /** The item to display */
  item: DiscoverFeedItem | null;
  /** Optional callback to preview a topic inside Reader */
  onPreviewTopic?: (slug: string) => void;
  /** Optional callback to preload topic preview chunk */
  onPreviewTopicHover?: (slug: string) => void;
}

export function DiscoverDetail({ item, onPreviewTopic, onPreviewTopicHover }: DiscoverDetailProps) {
  if (!item) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Select an article to preview</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with actions */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <h1 className="truncate text-sm font-semibold">{item.title}</h1>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            {/* Open original link */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" asChild>
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
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
            <span>{formatDate(item.editionAt)}</span>
          </div>

          {/* AI Summary */}
          {item.aiSummary && <AISummaryCard summary={item.aiSummary} />}

          {/* Topic card */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                From Topic
              </div>
              <h3 className="mb-2 font-semibold">{item.topic.title}</h3>
              <div className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
                <Icon icon={UserMultiple02Icon} className="size-4" />
                <span>
                  {item.topic.subscriberCount.toLocaleString()}{' '}
                  {item.topic.subscriberCount === 1 ? 'subscriber' : 'subscribers'}
                </span>
              </div>
              <Button variant="outline" size="sm" asChild>
                {onPreviewTopic ? (
                  <button
                    type="button"
                    onClick={() => onPreviewTopic(item.topic.slug)}
                    onMouseEnter={() => onPreviewTopicHover?.(item.topic.slug)}
                  >
                    <Icon icon={EyeIcon} className="mr-1 size-4" />
                    View Topic
                  </button>
                ) : (
                  <Link to="/topics/$slug" params={{ slug: item.topic.slug }}>
                    <Icon icon={EyeIcon} className="mr-1 size-4" />
                    View Topic
                  </Link>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Call to action */}
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              Want to get personalized content like this?
            </p>
            <Button asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                Read Full Article
              </a>
            </Button>
          </div>
        </article>
      </ScrollArea>
    </div>
  );
}
