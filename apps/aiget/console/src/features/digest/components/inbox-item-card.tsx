/**
 * Inbox Item Card Component
 *
 * [PROPS]: InboxItem, actions
 * [POS]: Single inbox item with read/save/dismiss actions
 */

import {
  Mail01Icon,
  MailOpen01Icon,
  BookmarkIcon,
  Cancel01Icon,
  LinkSquare01Icon,
} from '@hugeicons/core-free-icons';
import {
  Card,
  CardContent,
  Icon,
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@aiget/ui';
import { useUpdateInboxItemState } from '../hooks';
import type { InboxItem, InboxItemState } from '../types';

interface InboxItemCardProps {
  item: InboxItem;
}

function getScoreColor(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  return 'outline';
}

export function InboxItemCard({ item }: InboxItemCardProps) {
  const updateState = useUpdateInboxItemState();

  const handleStateChange = (state: InboxItemState) => {
    updateState.mutate({ id: item.id, state });
  };

  const isUnread = item.state === 'UNREAD';
  const isSaved = item.state === 'SAVED';

  return (
    <Card className={isUnread ? 'border-l-4 border-l-primary' : ''}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Score Badge */}
          <div className="flex shrink-0 flex-col items-center gap-1">
            <Badge variant={getScoreColor(item.scoreOverall)} className="text-sm font-medium">
              {item.scoreOverall}
            </Badge>
            <span className="text-xs text-muted-foreground">#{item.rank}</span>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3
                  className={`font-medium leading-tight ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {item.titleSnapshot}
                </h3>
                {item.aiSummarySnapshot && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {item.aiSummarySnapshot}
                  </p>
                )}
              </div>
            </div>

            {/* Meta and Actions */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {item.favicon && <img src={item.favicon} alt="" className="h-4 w-4 rounded-sm" />}
                {item.siteName && <span>{item.siteName}</span>}
                <span>{item.subscriptionName}</span>
                <span>
                  {new Date(item.deliveredAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              <TooltipProvider delayDuration={300}>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleStateChange(isUnread ? 'READ' : 'UNREAD')}
                        disabled={updateState.isPending}
                      >
                        <Icon icon={isUnread ? MailOpen01Icon : Mail01Icon} className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isUnread ? 'Mark as read' : 'Mark as unread'}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isSaved ? 'default' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleStateChange(isSaved ? 'READ' : 'SAVED')}
                        disabled={updateState.isPending}
                      >
                        <Icon icon={BookmarkIcon} className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isSaved ? 'Unsave' : 'Save for later'}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleStateChange('NOT_INTERESTED')}
                        disabled={updateState.isPending}
                      >
                        <Icon icon={Cancel01Icon} className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Not interested</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={item.urlSnapshot} target="_blank" rel="noopener noreferrer">
                          <Icon icon={LinkSquare01Icon} className="h-4 w-4" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open original</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
