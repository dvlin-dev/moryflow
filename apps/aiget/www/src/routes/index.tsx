/**
 * Homepage - Reader Layout
 *
 * [INPUT]: None
 * [OUTPUT]: Three-column reader layout with sidebar, article list, and detail
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
import {
  ReaderLayout,
  SidePanel,
  ArticleList,
  ArticleDetail,
  CreateSubscriptionDialog,
  SubscriptionSettingsDialog,
  PublishTopicDialog,
  WelcomeGuide,
  type FilterState,
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

  // View state
  const [selectedView, setSelectedView] = useState<'all' | 'saved' | string>('all');
  const [selectedArticle, setSelectedArticle] = useState<InboxItem | null>(null);
  const [filter, setFilter] = useState<FilterState>('all');

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  // Data queries
  const { data: subscriptionsData, isLoading: subscriptionsLoading } = useSubscriptions();
  const { data: userTopicsData } = useUserTopics();
  const { data: statsData } = useInboxStats();

  // Determine subscription ID for inbox query
  const subscriptionId =
    selectedView !== 'all' && selectedView !== 'saved' ? selectedView : undefined;

  // Inbox query with filters
  const {
    data: inboxData,
    isLoading: inboxLoading,
    refetch: refetchInbox,
    isRefetching,
  } = useInboxItems({
    subscriptionId,
    state: selectedView === 'saved' ? 'SAVED' : filterStateToInboxState(filter),
    limit: 50,
  });

  // Mutations
  const updateItemState = useUpdateInboxItemState();
  const markAllAsRead = useMarkAllAsRead();

  // Fetch full content for selected article
  const { data: contentData, isLoading: isLoadingContent } = useInboxItemContent(
    selectedArticle?.id ?? null
  );

  // Get current list title
  const getListTitle = useCallback(() => {
    if (selectedView === 'all') return 'All';
    if (selectedView === 'saved') return 'Saved';
    const subscription = subscriptionsData?.items.find((s) => s.id === selectedView);
    return subscription?.name || 'Inbox';
  }, [selectedView, subscriptionsData]);

  // Handle article selection
  const handleSelectArticle = useCallback(
    (item: InboxItem) => {
      setSelectedArticle(item);

      // Mark as read if unread
      if (!item.readAt) {
        updateItemState.mutate({ id: item.id, action: 'markRead' });
      }
    },
    [updateItemState]
  );

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

  // Handle subscription selection
  function handleSelectSubscription(_id: string | null, view: 'all' | 'saved' | string) {
    setSelectedView(view);
    setSelectedArticle(null);
    setFilter('all');
  }

  // Handle opening settings dialog for a subscription
  // Used by settings, history, and suggestions - dialog handles tab selection internally
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
  const stats = statsData || null;

  // Keyboard shortcuts
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
    enabled: !createDialogOpen && !settingsDialogOpen && !publishDialogOpen,
  });

  // Select first article when inbox loads
  useEffect(() => {
    if (inboxItems.length > 0 && !selectedArticle) {
      setSelectedArticle(inboxItems[0]);
    }
  }, [inboxItems, selectedArticle]);

  // Mobile detection
  const isMobile = useIsMobile();

  // Check if should show welcome guide
  const showWelcome =
    !authLoading && !subscriptionsLoading && subscriptions.length === 0 && inboxItems.length === 0;

  // Sidebar component
  const sidebar = (
    <SidePanel
      subscriptions={subscriptions}
      userTopics={userTopics}
      stats={stats}
      selectedView={selectedView}
      onSelect={handleSelectSubscription}
      onCreateClick={() => setCreateDialogOpen(true)}
      onSettingsClick={handleOpenSettingsDialog}
      onHistoryClick={handleOpenSettingsDialog}
      onSuggestionsClick={handleOpenSettingsDialog}
      onPublishClick={handleOpenPublishForSubscription}
      isLoading={subscriptionsLoading || authLoading}
    />
  );

  // Article list component
  const articleList = (
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

  // Article detail component - show welcome guide if no content
  const articleDetail = showWelcome ? (
    <WelcomeGuide
      onCreateSubscription={() => setCreateDialogOpen(true)}
      onDiscover={handleDiscover}
      isAuthenticated={isAuthenticated}
    />
  ) : (
    <ArticleDetail
      item={selectedArticle}
      onSave={handleSave}
      onNotInterested={handleNotInterested}
      fullContent={contentData?.markdown ?? null}
      isLoadingContent={isLoadingContent}
      isSaving={updateItemState.isPending}
    />
  );

  // Render mobile layout on small screens
  if (isMobile) {
    return (
      <>
        <MobileReaderLayout
          sidebar={sidebar}
          list={articleList}
          detail={articleDetail}
          hasSelectedArticle={!!selectedArticle}
          onBack={() => setSelectedArticle(null)}
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
      <ReaderLayout sidebar={sidebar} list={articleList} detail={articleDetail} />

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
