/**
 * Homepage - Reader Layout
 *
 * [INPUT]: None
 * [OUTPUT]: Three-column reader layout with sidebar, article/discover list, and detail
 * [POS]: aiget.dev homepage - Main entry point
 */

import { useState, useCallback, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth-context';
import {
  useSubscriptions,
  useUserTopics,
  useInboxItems,
  useInboxStats,
  useUpdateInboxItemState,
  useMarkAllAsRead,
  useInboxItemContent,
} from '@/features/digest/hooks';
import { useDiscoverFeed } from '@/features/discover';
import type { DiscoverFeedType, DiscoverFeedItem } from '@/features/discover/types';
import {
  ReaderLayout,
  SidePanel,
  ArticleList,
  ArticleDetail,
  DiscoverFeedList,
  DiscoverDetail,
  CreateSubscriptionDialog,
  SubscriptionSettingsDialog,
  PublishTopicDialog,
  WelcomeGuide,
  type FilterState,
  type SidePanelView,
} from '@/components/reader';
import { MobileReaderLayout } from '@/components/reader/MobileReaderLayout';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { InboxItem, Subscription, InboxItemState } from '@/features/digest/types';

export const Route = createFileRoute('/')({
  component: HomePage,
  head: () => ({
    meta: [
      { title: 'Aiget - AI-Powered Content Digest' },
      {
        name: 'description',
        content:
          'Subscribe to AI-curated topics and get intelligent summaries of what matters. Stay informed without information overload.',
      },
      { property: 'og:title', content: 'Aiget - AI-Powered Content Digest' },
      {
        property: 'og:description',
        content: 'Subscribe to AI-curated topics and get intelligent summaries of what matters.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://aiget.dev' }],
  }),
});

function filterStateToInboxState(filter: FilterState): InboxItemState | undefined {
  switch (filter) {
    case 'unread':
      return 'UNREAD';
    case 'saved':
      return 'SAVED';
    case 'not_interested':
      return 'NOT_INTERESTED';
    default:
      return undefined;
  }
}

function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // View state - default to discover for unauthenticated users
  const [currentView, setCurrentView] = useState<SidePanelView>({
    type: 'discover',
    feed: 'featured',
  });
  const [selectedArticle, setSelectedArticle] = useState<InboxItem | null>(null);
  const [selectedDiscoverItem, setSelectedDiscoverItem] = useState<DiscoverFeedItem | null>(null);
  const [filter, setFilter] = useState<FilterState>('all');

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  // Data queries - only fetch when authenticated
  const { data: subscriptionsData, isLoading: subscriptionsLoading } = useSubscriptions(undefined, {
    enabled: isAuthenticated,
  });
  const { data: userTopicsData } = useUserTopics({ enabled: isAuthenticated });
  const { data: statsData } = useInboxStats({ enabled: isAuthenticated });

  // Discover feed query
  const discoverFeedType = currentView.type === 'discover' ? currentView.feed : 'featured';
  const {
    data: discoverData,
    isLoading: discoverLoading,
    refetch: refetchDiscover,
    isRefetching: isDiscoverRefetching,
  } = useDiscoverFeed(discoverFeedType);

  // Determine subscription ID for inbox query
  const subscriptionId =
    currentView.type === 'inbox' && currentView.filter !== 'all' && currentView.filter !== 'saved'
      ? currentView.filter
      : undefined;

  // Inbox query with filters - only fetch when authenticated
  const {
    data: inboxData,
    isLoading: inboxLoading,
    refetch: refetchInbox,
    isRefetching,
  } = useInboxItems(
    {
      subscriptionId,
      state:
        currentView.type === 'inbox' && currentView.filter === 'saved'
          ? 'SAVED'
          : filterStateToInboxState(filter),
      limit: 50,
    },
    { enabled: isAuthenticated }
  );

  // Mutations
  const updateItemState = useUpdateInboxItemState();
  const markAllAsRead = useMarkAllAsRead();

  // Fetch full content for selected article
  const { data: contentData, isLoading: isLoadingContent } = useInboxItemContent(
    selectedArticle?.id ?? null
  );

  // Get current list title
  const getListTitle = useCallback(() => {
    if (currentView.type === 'discover') {
      return currentView.feed === 'featured' ? 'Featured' : 'Trending';
    }
    if (currentView.type === 'inbox') {
      if (currentView.filter === 'all') return 'All';
      if (currentView.filter === 'saved') return 'Saved';
      const subscription = subscriptionsData?.items.find((s) => s.id === currentView.filter);
      return subscription?.name || 'Inbox';
    }
    return 'Inbox';
  }, [currentView, subscriptionsData]);

  // Handle article selection (for inbox)
  const handleSelectArticle = useCallback(
    (item: InboxItem) => {
      setSelectedArticle(item);
      setSelectedDiscoverItem(null);

      // Mark as read if unread
      if (!item.readAt) {
        updateItemState.mutate({ id: item.id, action: 'markRead' });
      }
    },
    [updateItemState]
  );

  // Handle discover item selection
  const handleSelectDiscoverItem = useCallback((item: DiscoverFeedItem) => {
    setSelectedDiscoverItem(item);
    setSelectedArticle(null);
  }, []);

  // Handle save/unsave
  const handleSave = useCallback(
    (item: InboxItem) => {
      const action = item.savedAt ? 'unsave' : 'save';
      updateItemState.mutate({ id: item.id, action });
    },
    [updateItemState]
  );

  // Handle not interested
  const handleNotInterested = useCallback(
    (item: InboxItem) => {
      updateItemState.mutate({ id: item.id, action: 'notInterested' });
      // Move to next article or clear selection
      if (inboxData?.items) {
        const currentIndex = inboxData.items.findIndex((i) => i.id === item.id);
        const nextItem = inboxData.items[currentIndex + 1];
        setSelectedArticle(nextItem || null);
      }
    },
    [updateItemState, inboxData]
  );

  // Handle mark all read
  const handleMarkAllRead = useCallback(() => {
    markAllAsRead.mutate(subscriptionId);
  }, [markAllAsRead, subscriptionId]);

  // Handle view change from sidebar
  const handleViewChange = useCallback((view: SidePanelView) => {
    setCurrentView(view);
    setSelectedArticle(null);
    setSelectedDiscoverItem(null);
    setFilter('all');
  }, []);

  // Handle feed type change
  const handleFeedTypeChange = useCallback((feedType: DiscoverFeedType) => {
    setCurrentView({ type: 'discover', feed: feedType });
    setSelectedDiscoverItem(null);
  }, []);

  // Handle opening settings dialog for a subscription
  function handleOpenSettingsDialog(subscription: Subscription) {
    setSelectedSubscription(subscription);
    setSettingsDialogOpen(true);
  }

  // Handle opening publish dialog for a subscription
  const handleOpenPublishForSubscription = useCallback((subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setPublishDialogOpen(true);
  }, []);

  // Handle opening publish dialog (for settings dialog)
  const handleOpenPublish = useCallback(() => {
    if (selectedSubscription) {
      setPublishDialogOpen(true);
    }
  }, [selectedSubscription]);

  // Handle open original article
  const handleOpenOriginal = useCallback(() => {
    if (selectedArticle?.urlSnapshot) {
      window.open(selectedArticle.urlSnapshot, '_blank');
    }
  }, [selectedArticle]);

  // Handle navigate to discover
  const handleDiscover = useCallback(() => {
    navigate({ to: '/discover' });
  }, [navigate]);

  const subscriptions = subscriptionsData?.items || [];
  const userTopics = userTopicsData?.items || [];
  const inboxItems = inboxData?.items || [];
  const discoverItems = discoverData?.items || [];
  const stats = statsData || null;

  // Keyboard shortcuts (only for inbox view)
  useKeyboardShortcuts({
    items: inboxItems,
    selectedId: selectedArticle?.id || null,
    onSelect: (id) => {
      const item = inboxItems.find((i) => i.id === id);
      if (item) handleSelectArticle(item);
    },
    onSave: () => {
      if (selectedArticle) handleSave(selectedArticle);
    },
    onNotInterested: () => {
      if (selectedArticle) handleNotInterested(selectedArticle);
    },
    onOpenOriginal: handleOpenOriginal,
    onRefresh: () => refetchInbox(),
    onMarkAllRead: handleMarkAllRead,
    enabled:
      currentView.type === 'inbox' &&
      !createDialogOpen &&
      !settingsDialogOpen &&
      !publishDialogOpen,
  });

  // Select first article when inbox loads
  useEffect(() => {
    if (currentView.type === 'inbox' && inboxItems.length > 0 && !selectedArticle) {
      setSelectedArticle(inboxItems[0]);
    }
  }, [currentView.type, inboxItems, selectedArticle]);

  // Select first discover item when discover loads
  useEffect(() => {
    if (currentView.type === 'discover' && discoverItems.length > 0 && !selectedDiscoverItem) {
      setSelectedDiscoverItem(discoverItems[0]);
    }
  }, [currentView.type, discoverItems, selectedDiscoverItem]);

  // Switch to inbox view when authenticated user has subscriptions
  useEffect(() => {
    if (isAuthenticated && !authLoading && !subscriptionsLoading && subscriptions.length > 0) {
      // Only switch if currently on discover view
      if (currentView.type === 'discover') {
        setCurrentView({ type: 'inbox', filter: 'all' });
      }
    }
  }, [isAuthenticated, authLoading, subscriptionsLoading, subscriptions.length, currentView.type]);

  // Mobile detection
  const isMobile = useIsMobile();

  // Check if should show welcome guide (only for empty inbox view)
  const showWelcome =
    currentView.type === 'inbox' &&
    !authLoading &&
    !subscriptionsLoading &&
    subscriptions.length === 0 &&
    inboxItems.length === 0;

  // Sidebar component
  const sidebar = (
    <SidePanel
      subscriptions={subscriptions}
      userTopics={userTopics}
      stats={stats}
      currentView={currentView}
      onViewChange={handleViewChange}
      onCreateClick={() => setCreateDialogOpen(true)}
      onSettingsClick={handleOpenSettingsDialog}
      onHistoryClick={handleOpenSettingsDialog}
      onSuggestionsClick={handleOpenSettingsDialog}
      onPublishClick={handleOpenPublishForSubscription}
      isLoading={subscriptionsLoading || authLoading}
    />
  );

  // List component - conditionally render based on view type
  const listComponent =
    currentView.type === 'discover' ? (
      <DiscoverFeedList
        items={discoverItems}
        selectedId={selectedDiscoverItem?.id || null}
        onSelect={handleSelectDiscoverItem}
        feedType={discoverFeedType}
        onFeedTypeChange={handleFeedTypeChange}
        onRefresh={() => refetchDiscover()}
        isLoading={discoverLoading}
        isRefreshing={isDiscoverRefetching}
      />
    ) : (
      <ArticleList
        items={inboxItems}
        selectedId={selectedArticle?.id || null}
        onSelect={handleSelectArticle}
        title={getListTitle()}
        filter={filter}
        onFilterChange={setFilter}
        onRefresh={() => refetchInbox()}
        onMarkAllRead={handleMarkAllRead}
        isLoading={inboxLoading}
        isRefreshing={isRefetching}
      />
    );

  // Detail component - conditionally render based on view type and state
  const detailComponent = (() => {
    if (showWelcome) {
      return (
        <WelcomeGuide
          onCreateSubscription={() => setCreateDialogOpen(true)}
          onDiscover={handleDiscover}
          isAuthenticated={isAuthenticated}
        />
      );
    }

    if (currentView.type === 'discover') {
      return <DiscoverDetail item={selectedDiscoverItem} />;
    }

    return (
      <ArticleDetail
        item={selectedArticle}
        onSave={handleSave}
        onNotInterested={handleNotInterested}
        fullContent={contentData?.markdown ?? null}
        isLoadingContent={isLoadingContent}
        isSaving={updateItemState.isPending}
      />
    );
  })();

  // Render mobile layout on small screens
  if (isMobile) {
    const hasSelectedItem =
      currentView.type === 'discover' ? !!selectedDiscoverItem : !!selectedArticle;
    return (
      <>
        <MobileReaderLayout
          sidebar={sidebar}
          list={listComponent}
          detail={detailComponent}
          hasSelectedArticle={hasSelectedItem}
          onBack={() => {
            setSelectedArticle(null);
            setSelectedDiscoverItem(null);
          }}
        />
        <CreateSubscriptionDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        <SubscriptionSettingsDialog
          subscription={selectedSubscription}
          open={settingsDialogOpen}
          onOpenChange={setSettingsDialogOpen}
          onPublishClick={handleOpenPublish}
        />
        <PublishTopicDialog
          subscription={selectedSubscription}
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
        />
      </>
    );
  }

  return (
    <>
      <ReaderLayout sidebar={sidebar} list={listComponent} detail={detailComponent} />

      {/* Dialogs */}
      <CreateSubscriptionDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      <SubscriptionSettingsDialog
        subscription={selectedSubscription}
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        onPublishClick={handleOpenPublish}
      />

      <PublishTopicDialog
        subscription={selectedSubscription}
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
      />
    </>
  );
}
