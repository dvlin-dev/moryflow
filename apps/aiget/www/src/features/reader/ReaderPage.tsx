/**
 * Reader Page (Homepage)
 *
 * [INPUT]: None
 * [OUTPUT]: Reader 三栏布局（Discover Feed / Topic 浏览 / Inbox）
 * [POS]: Reader 模块唯一入口；所有 C 端操作应在该壳层内完成（弹窗优先）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DiscoverFeedType, DiscoverFeedItem } from '@/features/discover/types';
import { useDiscoverFeed } from '@/features/discover';
import {
  useInboxItemContent,
  useInboxItems,
  useInboxStats,
  useMarkAllAsRead,
  useSubscriptions,
  useUpdateInboxItemState,
  useUserTopics,
  useFollowTopic,
} from '@/features/digest/hooks';
import type { InboxItem, Subscription } from '@/features/digest/types';
import type { DigestTopicSummary } from '@/lib/digest-api';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/auth/auth-modal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SidePanel, type SidePanelView } from '@/components/reader/SidePanel';
import { ReaderDialogs } from './components/ReaderDialogs';
import { ReaderDetailPane } from './components/ReaderDetailPane';
import { ReaderListPane } from './components/ReaderListPane';
import { ReaderScaffold } from './components/ReaderScaffold';
import type { FilterState } from './reader.types';
import { filterStateToInboxState } from './reader.types';

export function ReaderPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { openAuthModal, isOpen: isAuthModalOpen } = useAuthModal();
  const didInitAuthedViewRef = useRef(false);

  const requireAuth = useCallback(
    (afterAuth: () => void) => {
      if (isAuthenticated) {
        afterAuth();
        return;
      }
      openAuthModal({ mode: 'login', afterAuth });
    },
    [isAuthenticated, openAuthModal]
  );

  const [currentView, setCurrentView] = useState<SidePanelView>({
    type: 'discover',
    feed: 'featured',
  });

  const [filter, setFilter] = useState<FilterState>('all');

  const [selectedArticle, setSelectedArticle] = useState<InboxItem | null>(null);
  const [selectedDiscoverItem, setSelectedDiscoverItem] = useState<DiscoverFeedItem | null>(null);
  const [selectedTopicSlug, setSelectedTopicSlug] = useState<string | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createDialogInitialTopic, setCreateDialogInitialTopic] = useState<string | undefined>();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  const { data: subscriptionsData, isLoading: subscriptionsLoading } = useSubscriptions(undefined, {
    enabled: isAuthenticated,
  });
  const { data: userTopicsData } = useUserTopics({ enabled: isAuthenticated });
  const { data: statsData } = useInboxStats({ enabled: isAuthenticated });

  const subscriptions = subscriptionsData?.items ?? [];
  const userTopics = userTopicsData?.items ?? [];
  const stats = statsData ?? null;

  const followedTopicIds = useMemo(() => {
    return new Set(
      subscriptionsData?.items
        .filter((s) => s.followedTopicId)
        .map((s) => s.followedTopicId as string) ?? []
    );
  }, [subscriptionsData?.items]);

  // Discover feed query (public)
  const discoverFeedType: DiscoverFeedType =
    currentView.type === 'discover' ? currentView.feed : 'featured';

  const {
    data: discoverData,
    isLoading: discoverLoading,
    refetch: refetchDiscover,
    isRefetching: isDiscoverRefetching,
  } = useDiscoverFeed(discoverFeedType);

  const discoverItems = discoverData?.items ?? [];

  const subscriptionId =
    currentView.type === 'inbox' && currentView.filter !== 'all' && currentView.filter !== 'saved'
      ? currentView.filter
      : undefined;

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
    { enabled: isAuthenticated && currentView.type === 'inbox' }
  );

  const inboxItems = inboxData?.items ?? [];

  const updateItemState = useUpdateInboxItemState();
  const markAllAsRead = useMarkAllAsRead();
  const followTopic = useFollowTopic();

  const { data: contentData, isLoading: isLoadingContent } = useInboxItemContent(
    selectedArticle?.id ?? null
  );

  const openCreateSubscription = useCallback(
    (initialQuery?: string) => {
      requireAuth(() => {
        setCreateDialogInitialTopic(initialQuery?.trim() || undefined);
        setCreateDialogOpen(true);
      });
    },
    [requireAuth]
  );

  const handleOpenSettingsDialog = useCallback((subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setSettingsDialogOpen(true);
  }, []);

  const handleOpenPublishForSubscription = useCallback((subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setPublishDialogOpen(true);
  }, []);

  const handleOpenPublish = useCallback(() => {
    if (selectedSubscription) {
      setPublishDialogOpen(true);
    }
  }, [selectedSubscription]);

  const handleSelectArticle = useCallback(
    (item: InboxItem) => {
      setSelectedArticle(item);
      setSelectedDiscoverItem(null);
      setSelectedTopicSlug(null);

      if (!item.readAt) {
        updateItemState.mutate({ id: item.id, action: 'markRead' });
      }
    },
    [updateItemState]
  );

  const handleSelectDiscoverItem = useCallback((item: DiscoverFeedItem) => {
    setSelectedDiscoverItem(item);
    setSelectedArticle(null);
    setSelectedTopicSlug(null);
  }, []);

  const handleSave = useCallback(
    (item: InboxItem) => {
      const action = item.savedAt ? 'unsave' : 'save';
      updateItemState.mutate({ id: item.id, action });
    },
    [updateItemState]
  );

  const handleNotInterested = useCallback(
    (item: InboxItem) => {
      updateItemState.mutate({ id: item.id, action: 'notInterested' });
      if (!inboxData?.items) return;
      const currentIndex = inboxData.items.findIndex((i) => i.id === item.id);
      const nextItem = inboxData.items[currentIndex + 1];
      setSelectedArticle(nextItem || null);
    },
    [updateItemState, inboxData]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead.mutate(subscriptionId);
  }, [markAllAsRead, subscriptionId]);

  const handleOpenOriginal = useCallback(() => {
    if (selectedArticle?.urlSnapshot) {
      window.open(selectedArticle.urlSnapshot, '_blank');
    }
  }, [selectedArticle]);

  const handleFollowTopic = useCallback(
    (topic: DigestTopicSummary) => {
      requireAuth(() => {
        followTopic.mutate({
          slug: topic.slug,
          data: {},
        });
      });
    },
    [followTopic, requireAuth]
  );

  const handleFollowTopicBySlug = useCallback(
    (slug: string) => {
      requireAuth(() => {
        followTopic.mutate({
          slug,
          data: {},
        });
      });
    },
    [followTopic, requireAuth]
  );

  const openTopicPreview = useCallback((slug: string) => {
    setCurrentView({ type: 'topics' });
    setSelectedTopicSlug(slug);
    setSelectedArticle(null);
    setSelectedDiscoverItem(null);
  }, []);

  const handleSelectTopic = useCallback((topic: DigestTopicSummary) => {
    setSelectedTopicSlug(topic.slug);
  }, []);

  const handleViewChange = useCallback((view: SidePanelView) => {
    setCurrentView(view);
    setSelectedArticle(null);
    setSelectedDiscoverItem(null);
    setSelectedTopicSlug(null);
    setFilter('all');
  }, []);

  const handleCreateDialogOpenChange = useCallback((next: boolean) => {
    setCreateDialogOpen(next);
    if (!next) {
      setCreateDialogInitialTopic(undefined);
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedArticle(null);
    setSelectedDiscoverItem(null);
    setSelectedTopicSlug(null);
  }, []);

  const handleSignIn = useCallback(() => {
    openAuthModal({ mode: 'login' });
  }, [openAuthModal]);

  // Keyboard shortcuts (only for inbox view)
  useKeyboardShortcuts({
    items: inboxItems,
    selectedId: selectedArticle?.id || null,
    onSelect: (id) => {
      const item = inboxItems.find((i) => i.id === id);
      if (item) handleSelectArticle(item);
    },
    onClearSelection: () => {
      setSelectedArticle(null);
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
      !publishDialogOpen &&
      !isAuthModalOpen,
  });

  // Auto-select first item for each view
  useEffect(() => {
    if (currentView.type === 'inbox' && inboxItems.length > 0 && !selectedArticle) {
      setSelectedArticle(inboxItems[0]);
    }
  }, [currentView.type, inboxItems, selectedArticle]);

  useEffect(() => {
    if (currentView.type === 'discover' && discoverItems.length > 0 && !selectedDiscoverItem) {
      setSelectedDiscoverItem(discoverItems[0]);
    }
  }, [currentView.type, discoverItems, selectedDiscoverItem]);

  // Switch to inbox view when authenticated user has subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;
    if (authLoading || subscriptionsLoading) return;
    if (didInitAuthedViewRef.current) return;

    // 登录后默认进入 Inbox；若没有订阅则显示 WelcomeGuide（空状态）
    setCurrentView({ type: 'inbox', filter: 'all' });
    didInitAuthedViewRef.current = true;
  }, [isAuthenticated, authLoading, subscriptionsLoading]);

  useEffect(() => {
    if (!isAuthenticated) {
      didInitAuthedViewRef.current = false;
    }
  }, [isAuthenticated]);

  const isMobile = useIsMobile();

  const showWelcome =
    currentView.type === 'inbox' &&
    !authLoading &&
    !subscriptionsLoading &&
    subscriptions.length === 0 &&
    inboxItems.length === 0;

  const sidebar = (
    <SidePanel
      subscriptions={subscriptions}
      userTopics={userTopics}
      stats={stats}
      currentView={currentView}
      onViewChange={handleViewChange}
      onCreateClick={() => openCreateSubscription()}
      onSettingsClick={handleOpenSettingsDialog}
      onHistoryClick={handleOpenSettingsDialog}
      onSuggestionsClick={handleOpenSettingsDialog}
      onPublishClick={handleOpenPublishForSubscription}
      onSignInClick={handleSignIn}
      onPreviewTopic={openTopicPreview}
      isLoading={subscriptionsLoading || authLoading}
    />
  );

  const inboxTitle = useMemo(() => {
    if (currentView.type !== 'inbox') return 'Inbox';
    if (currentView.filter === 'all') return 'All';
    if (currentView.filter === 'saved') return 'Saved';
    const subscription = subscriptionsData?.items.find((s) => s.id === currentView.filter);
    return subscription?.name || 'Inbox';
  }, [currentView, subscriptionsData?.items]);

  const listComponent = (
    <ReaderListPane
      currentView={currentView}
      discoverItems={discoverItems}
      selectedDiscoverItemId={selectedDiscoverItem?.id || null}
      onSelectDiscoverItem={handleSelectDiscoverItem}
      discoverFeedType={discoverFeedType}
      onDiscoverFeedTypeChange={(feedType) => setCurrentView({ type: 'discover', feed: feedType })}
      onDiscoverRefresh={() => refetchDiscover()}
      isDiscoverLoading={discoverLoading}
      isDiscoverRefreshing={isDiscoverRefetching}
      selectedTopicSlug={selectedTopicSlug}
      followedTopicIds={followedTopicIds}
      onSelectTopic={handleSelectTopic}
      onFollowTopic={handleFollowTopic}
      onCreateSubscription={openCreateSubscription}
      inboxItems={inboxItems}
      selectedArticleId={selectedArticle?.id || null}
      onSelectArticle={handleSelectArticle}
      inboxTitle={inboxTitle}
      filter={filter}
      onFilterChange={setFilter}
      onInboxRefresh={() => refetchInbox()}
      onMarkAllRead={handleMarkAllRead}
      isInboxLoading={inboxLoading}
      isInboxRefreshing={isRefetching}
    />
  );

  const detailComponent = (
    <ReaderDetailPane
      currentView={currentView}
      showWelcome={showWelcome}
      isAuthenticated={isAuthenticated}
      selectedDiscoverItem={selectedDiscoverItem}
      onPreviewTopic={openTopicPreview}
      selectedTopicSlug={selectedTopicSlug}
      followedTopicIds={followedTopicIds}
      onFollowTopicBySlug={handleFollowTopicBySlug}
      selectedArticle={selectedArticle}
      onSave={handleSave}
      onNotInterested={handleNotInterested}
      fullContent={contentData?.markdown ?? null}
      isLoadingContent={isLoadingContent}
      isSaving={updateItemState.isPending}
      onCreateSubscription={openCreateSubscription}
      onBrowseTopics={() => handleViewChange({ type: 'topics' })}
      onSignIn={handleSignIn}
    />
  );

  const hasSelectedItem =
    currentView.type === 'discover'
      ? Boolean(selectedDiscoverItem)
      : currentView.type === 'topics'
        ? Boolean(selectedTopicSlug)
        : Boolean(selectedArticle);

  return (
    <>
      <ReaderScaffold
        isMobile={isMobile}
        sidebar={sidebar}
        list={listComponent}
        detail={detailComponent}
        hasSelectedItem={hasSelectedItem}
        onBack={handleBack}
      />
      <ReaderDialogs
        createDialogOpen={createDialogOpen}
        createDialogInitialTopic={createDialogInitialTopic}
        onCreateDialogOpenChange={handleCreateDialogOpenChange}
        settingsDialogOpen={settingsDialogOpen}
        onSettingsDialogOpenChange={setSettingsDialogOpen}
        publishDialogOpen={publishDialogOpen}
        onPublishDialogOpenChange={setPublishDialogOpen}
        selectedSubscription={selectedSubscription}
        onPublishClick={handleOpenPublish}
      />
    </>
  );
}
