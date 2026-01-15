/**
 * [PROPS]: subscriptions, stats, selectedView, onSelect, onCreateClick, onDiscoverSelect
 * [POS]: Left sidebar with user info, navigation, discover section, and subscription list
 */

import { Link } from '@tanstack/react-router';
import { ScrollArea, Separator, Button, Badge, Skeleton, Icon } from '@aiget/ui';
import {
  Add01Icon,
  InboxIcon,
  Search01Icon,
  StarIcon,
  Notification01Icon,
  Fire02Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { useAuth } from '@/lib/auth-context';
import { UserMenu } from './UserMenu';
import { SubscriptionItem } from './SubscriptionItem';
import { useFeaturedTopics } from '@/features/discover';
import type { Subscription, InboxStats, Topic } from '@/features/digest/types';
import type { DiscoverFeedType } from '@/features/discover/types';

// View type for the sidebar
export type SidePanelView =
  | { type: 'inbox'; filter: 'all' | 'saved' | string }
  | { type: 'discover'; feed: DiscoverFeedType };

interface SidePanelProps {
  /** User subscriptions */
  subscriptions: Subscription[];
  /** User's published topics */
  userTopics?: Topic[];
  /** Inbox statistics */
  stats: InboxStats | null;
  /** Current view state */
  currentView: SidePanelView;
  /** Callback when selecting a view */
  onViewChange: (view: SidePanelView) => void;
  /** Callback to open create subscription dialog */
  onCreateClick: () => void;
  /** Callback to open settings dialog for a subscription */
  onSettingsClick?: (subscription: Subscription) => void;
  /** Callback to open run history dialog for a subscription */
  onHistoryClick?: (subscription: Subscription) => void;
  /** Callback to open learning suggestions dialog for a subscription */
  onSuggestionsClick?: (subscription: Subscription) => void;
  /** Callback to open publish topic dialog for a subscription */
  onPublishClick?: (subscription: Subscription) => void;
  /** Loading state */
  isLoading?: boolean;
}

export function SidePanel({
  subscriptions,
  userTopics = [],
  stats,
  currentView,
  onViewChange,
  onCreateClick,
  onSettingsClick,
  onHistoryClick,
  onSuggestionsClick,
  onPublishClick,
  isLoading,
}: SidePanelProps) {
  const { user, isAuthenticated } = useAuth();
  const { data: featuredTopicsData } = useFeaturedTopics(5);

  // Helper to check if a view is selected
  const isViewSelected = (view: SidePanelView): boolean => {
    if (currentView.type !== view.type) return false;
    if (view.type === 'inbox' && currentView.type === 'inbox') {
      return currentView.filter === view.filter;
    }
    if (view.type === 'discover' && currentView.type === 'discover') {
      return currentView.feed === view.feed;
    }
    return false;
  };

  const hasSubscriptions = subscriptions.length > 0;
  const showInboxSection = isAuthenticated && hasSubscriptions;

  return (
    <div className="flex h-full flex-col">
      {/* User area */}
      <div className="p-3">
        {isAuthenticated && user ? (
          <UserMenu user={user} stats={stats} />
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Icon icon={Notification01Icon} className="size-4" />
            <span>Sign in / Register</span>
          </Link>
        )}
      </div>

      <Separator />

      {/* Discover section */}
      <div className="space-y-0.5 p-2">
        <div className="px-2 py-1">
          <span className="text-xs font-medium uppercase text-muted-foreground">Discover</span>
        </div>
        <button
          onClick={() => onViewChange({ type: 'discover', feed: 'featured' })}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
            isViewSelected({ type: 'discover', feed: 'featured' })
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Icon icon={SparklesIcon} className="size-4" />
          <span>Featured</span>
        </button>
        <button
          onClick={() => onViewChange({ type: 'discover', feed: 'trending' })}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
            isViewSelected({ type: 'discover', feed: 'trending' })
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          }`}
        >
          <Icon icon={Fire02Icon} className="size-4" />
          <span>Trending</span>
        </button>
      </div>

      {/* Featured Topics list */}
      {featuredTopicsData?.items && featuredTopicsData.items.length > 0 && (
        <>
          <Separator />
          <div className="space-y-0.5 p-2">
            <div className="px-2 py-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Featured Topics
              </span>
            </div>
            {featuredTopicsData.items.map((topic) => (
              <Link
                key={topic.id}
                to="/topics/$slug"
                params={{ slug: topic.slug }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <span className="truncate">{topic.title}</span>
              </Link>
            ))}
            <Link
              to="/discover"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Icon icon={Search01Icon} className="size-4" />
              <span>Browse all</span>
            </Link>
          </div>
        </>
      )}

      {/* Inbox section - only show if user has subscriptions */}
      {showInboxSection && (
        <>
          <Separator />
          <div className="space-y-0.5 p-2">
            <div className="px-2 py-1">
              <span className="text-xs font-medium uppercase text-muted-foreground">Inbox</span>
            </div>
            <button
              onClick={() => onViewChange({ type: 'inbox', filter: 'all' })}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                isViewSelected({ type: 'inbox', filter: 'all' })
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon icon={InboxIcon} className="size-4" />
                <span>All</span>
              </div>
              {stats && stats.unreadCount > 0 && (
                <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
                  {stats.unreadCount}
                </Badge>
              )}
            </button>
            <button
              onClick={() => onViewChange({ type: 'inbox', filter: 'saved' })}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                isViewSelected({ type: 'inbox', filter: 'saved' })
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon icon={StarIcon} className="size-4" />
                <span>Saved</span>
              </div>
              {stats && stats.savedCount > 0 && (
                <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
                  {stats.savedCount}
                </Badge>
              )}
            </button>
          </div>
        </>
      )}

      <Separator />

      {/* Subscriptions section */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Create button */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 w-full justify-start gap-2 text-muted-foreground"
            onClick={onCreateClick}
            disabled={!isAuthenticated}
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
                  onSettingsClick={
                    onSettingsClick ? () => onSettingsClick(subscription) : undefined
                  }
                  onHistoryClick={onHistoryClick ? () => onHistoryClick(subscription) : undefined}
                  onSuggestionsClick={
                    onSuggestionsClick ? () => onSuggestionsClick(subscription) : undefined
                  }
                  onPublishClick={onPublishClick ? () => onPublishClick(subscription) : undefined}
                />
              ))}
            </div>
          )}

          {/* Published topics */}
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
                  <Link
                    key={topic.id}
                    to="/topics/$slug"
                    params={{ slug: topic.slug }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Icon icon={Notification01Icon} className="size-4" />
                    <span className="truncate">{topic.title}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
