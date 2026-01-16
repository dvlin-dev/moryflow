/**
 * [PROVIDES]: useReaderController
 * [DEPENDS]: digest/discover hooks, auth modal, keyboard shortcuts
 * [POS]: ReaderPage 的“控制器”——集中管理状态/数据/交互，并输出可渲染的 ViewModels
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAuthModal } from '@/components/auth/auth-modal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { SidePanelActions, SidePanelView } from '@/components/reader/SidePanel';
import type { SubscriptionAction } from '@/components/reader/subscriptions/subscriptionActions';
import type { DiscoverFeedItem, DiscoverFeedType } from '@/features/discover/types';
import { useDiscoverFeed } from '@/features/discover';
import {
  useFollowTopic,
  useInboxItemContent,
  useInboxItems,
  useInboxStats,
  useMarkAllAsRead,
  useSubscriptions,
  useUpdateInboxItemState,
  useUserTopics,
} from '@/features/digest/hooks';
import type { InboxItem, InboxStats, Subscription, Topic } from '@/features/digest/types';
import type { DigestTopicSummary } from '@/lib/digest-api';
import type { FilterState } from './reader.types';
import { filterStateToInboxState } from './reader.types';
import type { ReaderDetailPaneModel, ReaderListPaneModel } from './reader.models';
import {
  preloadCreateSubscriptionDialog,
  preloadPublishTopicDialog,
  preloadSubscriptionSettingsDialog,
  preloadTopicBrowseList,
  preloadTopicPreviewDetail,
} from './reader.preload';

interface ReaderController {
  isMobile: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
  subscriptionsLoading: boolean;
  sidebarProps: {
    subscriptions: Subscription[];
    userTopics: Topic[];
    stats: InboxStats | null;
    currentView: SidePanelView;
    actions: SidePanelActions;
    isLoading: boolean;
  };
  listResetKeys: unknown[];
  listModel: ReaderListPaneModel;
  detailResetKeys: unknown[];
  detailModel: ReaderDetailPaneModel;
  hasSelectedItem: boolean;
  onBack: () => void;
  onBackToDiscover: () => void;
  dialogs: {
    createDialogOpen: boolean;
    createDialogInitialTopic?: string;
    onCreateDialogOpenChange: (open: boolean) => void;
    settingsDialogOpen: boolean;
    onSettingsDialogOpenChange: (open: boolean) => void;
    publishDialogOpen: boolean;
    onPublishDialogOpenChange: (open: boolean) => void;
    selectedSubscription: Subscription | null;
    onPublishClick: () => void;
  };
}

export function useReaderController(): ReaderController {
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

  const [optimisticFollowedTopicIds, setOptimisticFollowedTopicIds] = useState<Set<string>>(
    () => new Set()
  );
  const [pendingFollowTopicIds, setPendingFollowTopicIds] = useState<Set<string>>(() => new Set());

  const effectiveFollowedTopicIds = useMemo(() => {
    if (optimisticFollowedTopicIds.size === 0) return followedTopicIds;
    return new Set([...followedTopicIds, ...optimisticFollowedTopicIds]);
  }, [followedTopicIds, optimisticFollowedTopicIds]);

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
        preloadCreateSubscriptionDialog();
        setCreateDialogInitialTopic(initialQuery?.trim() || undefined);
        setCreateDialogOpen(true);
      });
    },
    [requireAuth]
  );

  const handleOpenSettingsDialog = useCallback((subscription: Subscription) => {
    preloadSubscriptionSettingsDialog();
    setSelectedSubscription(subscription);
    setSettingsDialogOpen(true);
  }, []);

  const handleOpenPublishForSubscription = useCallback((subscription: Subscription) => {
    preloadPublishTopicDialog();
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

  const startFollowTopic = useCallback(
    (topic: { id: string; slug: string }) => {
      requireAuth(() => {
        setOptimisticFollowedTopicIds((prev) => new Set(prev).add(topic.id));
        setPendingFollowTopicIds((prev) => new Set(prev).add(topic.id));
        followTopic.mutate(
          { slug: topic.slug, data: {} },
          {
            onError: () => {
              setOptimisticFollowedTopicIds((prev) => {
                const next = new Set(prev);
                next.delete(topic.id);
                return next;
              });
            },
            onSettled: () => {
              setPendingFollowTopicIds((prev) => {
                const next = new Set(prev);
                next.delete(topic.id);
                return next;
              });
            },
          }
        );
      });
    },
    [followTopic, requireAuth]
  );

  const handleFollowTopic = useCallback(
    (topic: DigestTopicSummary) => startFollowTopic({ id: topic.id, slug: topic.slug }),
    [startFollowTopic]
  );

  const handleFollowTopicFromPreview = useCallback(
    (topic: { id: string; slug: string }) => startFollowTopic(topic),
    [startFollowTopic]
  );

  // Clear optimistic ids once server state catches up.
  useEffect(() => {
    if (followedTopicIds.size === 0) return;
    setOptimisticFollowedTopicIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      for (const id of followedTopicIds) {
        next.delete(id);
      }
      return next;
    });
    setPendingFollowTopicIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      for (const id of followedTopicIds) {
        next.delete(id);
      }
      return next;
    });
  }, [followedTopicIds]);

  const openTopicPreview = useCallback((slug: string) => {
    preloadTopicBrowseList();
    preloadTopicPreviewDetail();
    setCurrentView({ type: 'topics' });
    setSelectedTopicSlug(slug);
    setSelectedArticle(null);
    setSelectedDiscoverItem(null);
  }, []);

  const handleSelectTopic = useCallback((topic: DigestTopicSummary) => {
    setSelectedTopicSlug(topic.slug);
  }, []);

  const handleViewChange = useCallback((view: SidePanelView) => {
    if (view.type === 'topics') {
      preloadTopicBrowseList();
    }
    setCurrentView(view);
    setSelectedArticle(null);
    setSelectedDiscoverItem(null);
    setSelectedTopicSlug(null);
    setFilter('all');
  }, []);

  const handleCreateDialogOpenChange = useCallback((next: boolean) => {
    setCreateDialogOpen(next);
    if (!next) setCreateDialogInitialTopic(undefined);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedArticle(null);
    setSelectedDiscoverItem(null);
    setSelectedTopicSlug(null);
  }, []);

  const handleBackToDiscover = useCallback(() => {
    handleViewChange({ type: 'discover', feed: 'featured' });
  }, [handleViewChange]);

  const handleSignIn = useCallback(() => {
    openAuthModal({ mode: 'login' });
  }, [openAuthModal]);

  const handleSubscriptionAction = useCallback(
    (action: SubscriptionAction, subscription: Subscription) => {
      switch (action) {
        case 'publish':
          handleOpenPublishForSubscription(subscription);
          return;
        case 'settings':
        case 'history':
        case 'suggestions':
          handleOpenSettingsDialog(subscription);
          return;
        default: {
          const _exhaustive: never = action;
          return _exhaustive;
        }
      }
    },
    [handleOpenPublishForSubscription, handleOpenSettingsDialog]
  );

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

  // Switch to inbox view when authenticated user logs in
  useEffect(() => {
    if (!isAuthenticated) return;
    if (authLoading || subscriptionsLoading) return;
    if (didInitAuthedViewRef.current) return;
    setCurrentView({ type: 'inbox', filter: 'all' });
    didInitAuthedViewRef.current = true;
  }, [isAuthenticated, authLoading, subscriptionsLoading]);

  useEffect(() => {
    if (!isAuthenticated) didInitAuthedViewRef.current = false;
  }, [isAuthenticated]);

  const isMobile = useIsMobile();

  const showWelcome =
    currentView.type === 'inbox' &&
    !authLoading &&
    !subscriptionsLoading &&
    subscriptions.length === 0 &&
    inboxItems.length === 0;

  const inboxTitle = useMemo(() => {
    if (currentView.type !== 'inbox') return 'Inbox';
    if (currentView.filter === 'all') return 'All';
    if (currentView.filter === 'saved') return 'Saved';
    const subscription = subscriptionsData?.items.find((s) => s.id === currentView.filter);
    return subscription?.name || 'Inbox';
  }, [currentView, subscriptionsData?.items]);

  const sidePanelActions: SidePanelActions = useMemo(
    () => ({
      auth: { onSignIn: handleSignIn },
      navigation: {
        onViewChange: handleViewChange,
        onBrowseTopics: () => handleViewChange({ type: 'topics' }),
        onBrowseTopicsHover: preloadTopicBrowseList,
        onPreviewTopic: openTopicPreview,
        onPreviewTopicHover: (_slug) => preloadTopicPreviewDetail(),
      },
      subscriptions: {
        onCreate: () => openCreateSubscription(),
        onCreateHover: preloadCreateSubscriptionDialog,
        onSubscriptionAction: handleSubscriptionAction,
      },
    }),
    [
      handleSignIn,
      handleViewChange,
      openTopicPreview,
      openCreateSubscription,
      handleSubscriptionAction,
    ]
  );

  const sidebarProps = useMemo(
    () => ({
      subscriptions,
      userTopics,
      stats,
      currentView,
      actions: sidePanelActions,
      isLoading: subscriptionsLoading || authLoading,
    }),
    [
      subscriptions,
      userTopics,
      stats,
      currentView,
      sidePanelActions,
      subscriptionsLoading,
      authLoading,
    ]
  );

  const listResetKeys = useMemo(
    () => [
      currentView.type,
      currentView.type === 'discover'
        ? currentView.feed
        : currentView.type === 'inbox'
          ? currentView.filter
          : 'topics',
    ],
    [currentView]
  );

  const listModel: ReaderListPaneModel = useMemo(() => {
    if (currentView.type === 'discover') {
      return {
        type: 'discover',
        items: discoverItems,
        selectedId: selectedDiscoverItem?.id || null,
        feedType: discoverFeedType,
        onSelect: handleSelectDiscoverItem,
        onFeedTypeChange: (feedType) => setCurrentView({ type: 'discover', feed: feedType }),
        onRefresh: () => refetchDiscover(),
        isLoading: discoverLoading,
        isRefreshing: isDiscoverRefetching,
      };
    }

    if (currentView.type === 'topics') {
      return {
        type: 'topics',
        selectedSlug: selectedTopicSlug,
        followedTopicIds: effectiveFollowedTopicIds,
        pendingFollowTopicIds,
        onSelectTopic: handleSelectTopic,
        onFollowTopic: handleFollowTopic,
        onCreateSubscription: openCreateSubscription,
      };
    }

    return {
      type: 'inbox',
      items: inboxItems,
      selectedId: selectedArticle?.id || null,
      title: inboxTitle,
      filter,
      onSelect: handleSelectArticle,
      onFilterChange: setFilter,
      onRefresh: () => refetchInbox(),
      onMarkAllRead: handleMarkAllRead,
      isLoading: inboxLoading,
      isRefreshing: isRefetching,
    };
  }, [
    currentView.type,
    discoverItems,
    selectedDiscoverItem?.id,
    discoverFeedType,
    handleSelectDiscoverItem,
    refetchDiscover,
    discoverLoading,
    isDiscoverRefetching,
    selectedTopicSlug,
    effectiveFollowedTopicIds,
    pendingFollowTopicIds,
    handleSelectTopic,
    handleFollowTopic,
    openCreateSubscription,
    inboxItems,
    selectedArticle?.id,
    inboxTitle,
    filter,
    handleSelectArticle,
    refetchInbox,
    handleMarkAllRead,
    inboxLoading,
    isRefetching,
  ]);

  const detailResetKeys = useMemo(
    () => [
      currentView.type,
      selectedArticle?.id ?? null,
      selectedDiscoverItem?.id ?? null,
      selectedTopicSlug ?? null,
    ],
    [currentView.type, selectedArticle?.id, selectedDiscoverItem?.id, selectedTopicSlug]
  );

  const detailModel: ReaderDetailPaneModel = useMemo(() => {
    if (showWelcome) {
      return {
        type: 'welcome',
        isAuthenticated,
        onCreateSubscription: openCreateSubscription,
        onCreateSubscriptionHover: preloadCreateSubscriptionDialog,
        onBrowseTopics: () => handleViewChange({ type: 'topics' }),
        onBrowseTopicsHover: preloadTopicBrowseList,
        onSignIn: handleSignIn,
      };
    }

    if (currentView.type === 'discover') {
      return {
        type: 'discover',
        item: selectedDiscoverItem,
        onPreviewTopic: openTopicPreview,
        onPreviewTopicHover: (_slug) => preloadTopicPreviewDetail(),
      };
    }

    if (currentView.type === 'topics') {
      return {
        type: 'topics',
        slug: selectedTopicSlug,
        followedTopicIds: effectiveFollowedTopicIds,
        pendingFollowTopicIds,
        onFollowTopic: handleFollowTopicFromPreview,
      };
    }

    return {
      type: 'article',
      item: selectedArticle,
      onSave: handleSave,
      onNotInterested: handleNotInterested,
      fullContent: contentData?.markdown ?? null,
      isLoadingContent,
      isSaving: updateItemState.isPending,
    };
  }, [
    showWelcome,
    isAuthenticated,
    openCreateSubscription,
    handleViewChange,
    handleSignIn,
    currentView.type,
    selectedDiscoverItem,
    openTopicPreview,
    selectedTopicSlug,
    effectiveFollowedTopicIds,
    pendingFollowTopicIds,
    handleFollowTopicFromPreview,
    selectedArticle,
    handleSave,
    handleNotInterested,
    contentData?.markdown,
    isLoadingContent,
    updateItemState.isPending,
  ]);

  const hasSelectedItem =
    currentView.type === 'discover'
      ? Boolean(selectedDiscoverItem)
      : currentView.type === 'topics'
        ? Boolean(selectedTopicSlug)
        : Boolean(selectedArticle);

  return {
    isMobile,
    isAuthenticated,
    authLoading,
    subscriptionsLoading,
    sidebarProps,
    listResetKeys,
    listModel,
    detailResetKeys,
    detailModel,
    hasSelectedItem,
    onBack: handleBack,
    onBackToDiscover: handleBackToDiscover,
    dialogs: {
      createDialogOpen,
      createDialogInitialTopic,
      onCreateDialogOpenChange: handleCreateDialogOpenChange,
      settingsDialogOpen,
      onSettingsDialogOpenChange: setSettingsDialogOpen,
      publishDialogOpen,
      onPublishDialogOpenChange: setPublishDialogOpen,
      selectedSubscription,
      onPublishClick: handleOpenPublish,
    },
  };
}
