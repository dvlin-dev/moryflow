/**
 * [PROPS]: subscriptions, userTopics, currentView, actions
 * [POS]: SidePanel 订阅区（创建订阅 + 列表 + Published topics）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import { Link } from '@tanstack/react-router';
import { ScrollArea, Separator, Button, Skeleton, Icon } from '@aiget/ui';
import { Add01Icon, Notification01Icon } from '@hugeicons/core-free-icons';
import type { Subscription, Topic } from '@/features/digest/types';
import type { SubscriptionAction } from '../subscriptions/subscriptionActions';
import type { SidePanelView } from './side-panel.types';
import { SubscriptionItem } from '../SubscriptionItem';

interface SidePanelSubscriptionsProps {
  subscriptions: Subscription[];
  userTopics: Topic[];
  currentView: SidePanelView;
  isAuthenticated: boolean;
  isLoading: boolean;
  onCreate: () => void;
  onCreateHover?: () => void;
  onViewChange: (view: SidePanelView) => void;
  onPreviewTopic?: (slug: string) => void;
  onSubscriptionAction: (action: SubscriptionAction, subscription: Subscription) => void;
}

export function SidePanelSubscriptions({
  subscriptions,
  userTopics,
  currentView,
  isAuthenticated,
  isLoading,
  onCreate,
  onCreateHover,
  onViewChange,
  onPreviewTopic,
  onSubscriptionAction,
}: SidePanelSubscriptionsProps) {
  return (
    <>
      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 w-full justify-start gap-2 text-muted-foreground"
            onClick={onCreate}
            onMouseEnter={onCreateHover}
          >
            <Icon icon={Add01Icon} className="size-4" />
            <span>New Subscription</span>
          </Button>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              {isAuthenticated ? 'No subscriptions yet' : 'Sign in to create subscriptions'}
            </p>
          ) : (
            <div className="space-y-0.5">
              <div className="px-2 py-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Subscriptions
                </span>
              </div>
              {subscriptions.map((subscription) => (
                <SubscriptionItem
                  key={subscription.id}
                  subscription={subscription}
                  isSelected={
                    currentView.type === 'inbox' && currentView.filter === subscription.id
                  }
                  onSelect={() => onViewChange({ type: 'inbox', filter: subscription.id })}
                  onAction={onSubscriptionAction}
                />
              ))}
            </div>
          )}

          {userTopics.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="px-2 py-1">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Published Topics
                </span>
              </div>
              <div className="space-y-0.5">
                {userTopics.map((topic) => (
                  <div key={topic.id}>
                    {onPreviewTopic ? (
                      <button
                        type="button"
                        onClick={() => onPreviewTopic(topic.slug)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Icon icon={Notification01Icon} className="size-4" />
                        <span className="truncate">{topic.title}</span>
                      </button>
                    ) : (
                      <Link
                        to="/topics/$slug"
                        params={{ slug: topic.slug }}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Icon icon={Notification01Icon} className="size-4" />
                        <span className="truncate">{topic.title}</span>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </>
  );
}
