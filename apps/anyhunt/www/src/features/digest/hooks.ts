/**
 * [PROVIDES]: React Query hooks for digest operations
 * [POS]: Data fetching and mutation hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from './api';
import type {
  InboxItem,
  InboxItemState,
  InboxStats,
  PaginatedResponse,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionQueryParams,
  InboxQueryParams,
  InboxItemAction,
  RunQueryParams,
  CreateTopicInput,
  UpdateTopicInput,
  FollowTopicInput,
  ApplySuggestionsInput,
} from './types';

function getInboxItemState(
  item: Pick<InboxItem, 'readAt' | 'savedAt' | 'notInterestedAt'>
): InboxItemState {
  if (item.savedAt) return 'SAVED';
  if (item.notInterestedAt) return 'NOT_INTERESTED';
  if (item.readAt) return 'READ';
  return 'UNREAD';
}

function applyInboxItemAction(item: InboxItem, action: InboxItemAction, nowIso: string): InboxItem {
  switch (action) {
    case 'markRead': {
      const next = { ...item, readAt: item.readAt ?? nowIso };
      return { ...next, state: getInboxItemState(next) };
    }
    case 'markUnread': {
      const next = { ...item, readAt: null };
      return { ...next, state: getInboxItemState(next) };
    }
    case 'save': {
      const next = { ...item, savedAt: item.savedAt ?? nowIso };
      return { ...next, state: getInboxItemState(next) };
    }
    case 'unsave': {
      const next = { ...item, savedAt: null };
      return { ...next, state: getInboxItemState(next) };
    }
    case 'notInterested': {
      const next = { ...item, notInterestedAt: item.notInterestedAt ?? nowIso };
      return { ...next, state: getInboxItemState(next) };
    }
    case 'undoNotInterested': {
      const next = { ...item, notInterestedAt: null };
      return { ...next, state: getInboxItemState(next) };
    }
    default: {
      return item;
    }
  }
}

function shouldKeepInboxItemForQuery(item: InboxItem, params?: InboxQueryParams): boolean {
  if (params?.subscriptionId && item.subscriptionId !== params.subscriptionId) return false;
  if (!params?.state) return true;
  return item.state === params.state;
}

function updateInboxStatsForItemChange(
  stats: InboxStats,
  prev: InboxItem,
  next: InboxItem
): InboxStats {
  let unreadCount = stats.unreadCount;
  let savedCount = stats.savedCount;

  if (prev.state === 'UNREAD' && next.state !== 'UNREAD') unreadCount -= 1;
  if (prev.state !== 'UNREAD' && next.state === 'UNREAD') unreadCount += 1;

  if (prev.state === 'SAVED' && next.state !== 'SAVED') savedCount -= 1;
  if (prev.state !== 'SAVED' && next.state === 'SAVED') savedCount += 1;

  return {
    ...stats,
    unreadCount: Math.max(0, unreadCount),
    savedCount: Math.max(0, savedCount),
  };
}

// ========== Query Keys ==========

export const digestKeys = {
  all: ['digest'] as const,
  subscriptions: () => [...digestKeys.all, 'subscriptions'] as const,
  subscription: (id: string) => [...digestKeys.subscriptions(), id] as const,
  inbox: () => [...digestKeys.all, 'inbox'] as const,
  inboxItems: (params?: InboxQueryParams) => [...digestKeys.inbox(), 'items', params] as const,
  inboxStats: () => [...digestKeys.inbox(), 'stats'] as const,
  inboxItemContent: (itemId: string) => [...digestKeys.inbox(), 'content', itemId] as const,
  runs: (subscriptionId: string) => [...digestKeys.all, 'runs', subscriptionId] as const,
  topics: () => [...digestKeys.all, 'topics'] as const,
  publicTopic: (slug: string) => [...digestKeys.all, 'public-topic', slug] as const,
  feedback: (subscriptionId: string) => [...digestKeys.all, 'feedback', subscriptionId] as const,
  feedbackSuggestions: (subscriptionId: string) =>
    [...digestKeys.feedback(subscriptionId), 'suggestions'] as const,
  feedbackStats: (subscriptionId: string) =>
    [...digestKeys.feedback(subscriptionId), 'stats'] as const,
};

// ========== Subscription Hooks ==========

export function useSubscriptions(
  params?: SubscriptionQueryParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...digestKeys.subscriptions(), params],
    queryFn: () => api.fetchSubscriptions(params),
    enabled: options?.enabled ?? true,
  });
}

export function useSubscription(id: string) {
  return useQuery({
    queryKey: digestKeys.subscription(id),
    queryFn: () => api.fetchSubscription(id),
    enabled: !!id,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubscriptionInput) => api.createSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestKeys.subscriptions() });
      toast.success('Subscription created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create subscription');
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubscriptionInput }) =>
      api.updateSubscription(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: digestKeys.subscription(id) });
      queryClient.invalidateQueries({ queryKey: digestKeys.subscriptions() });
      toast.success('Subscription updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update subscription');
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestKeys.subscriptions() });
      toast.success('Subscription deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete subscription');
    },
  });
}

export function useToggleSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.toggleSubscription(id),
    onSuccess: (subscription) => {
      queryClient.invalidateQueries({ queryKey: digestKeys.subscription(subscription.id) });
      queryClient.invalidateQueries({ queryKey: digestKeys.subscriptions() });
      toast.success(subscription.enabled ? 'Subscription enabled' : 'Subscription paused');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to toggle subscription');
    },
  });
}

export function useTriggerManualRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscriptionId: string) => api.triggerManualRun(subscriptionId),
    onSuccess: (_, subscriptionId) => {
      queryClient.invalidateQueries({ queryKey: digestKeys.runs(subscriptionId) });
      queryClient.invalidateQueries({ queryKey: digestKeys.subscription(subscriptionId) });
      toast.success('Run triggered');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to trigger run');
    },
  });
}

// ========== Inbox Hooks ==========

export function useInboxItemContent(itemId: string | null) {
  return useQuery({
    queryKey: digestKeys.inboxItemContent(itemId ?? ''),
    queryFn: () => {
      if (!itemId) throw new Error('Item ID is required');
      return api.fetchInboxItemContent(itemId);
    },
    enabled: !!itemId,
  });
}

export function useInboxItems(params?: InboxQueryParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: digestKeys.inboxItems(params),
    queryFn: () => api.fetchInboxItems(params),
    enabled: options?.enabled ?? true,
  });
}

export function useInboxStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: digestKeys.inboxStats(),
    queryFn: () => api.fetchInboxStats(),
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateInboxItemState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: InboxItemAction }) =>
      api.updateInboxItemState(id, action),
    onMutate: async ({ id, action }) => {
      const nowIso = new Date().toISOString();

      await queryClient.cancelQueries({ queryKey: digestKeys.inbox() });

      const previousQueries = queryClient.getQueriesData<PaginatedResponse<InboxItem>>({
        queryKey: digestKeys.inbox(),
      });
      const previousStats = queryClient.getQueryData<InboxStats>(digestKeys.inboxStats());

      let previousItem: InboxItem | null = null;
      let nextItem: InboxItem | null = null;

      for (const [queryKey] of previousQueries) {
        if (!Array.isArray(queryKey)) continue;
        if (queryKey[2] !== 'items') continue;

        const params = queryKey[3] as InboxQueryParams | undefined;

        queryClient.setQueryData<PaginatedResponse<InboxItem> | undefined>(queryKey, (old) => {
          if (!old) return old;

          const updatedItems = old.items
            .map((item) => {
              if (item.id !== id) return item;
              previousItem = previousItem ?? item;
              const updated = applyInboxItemAction(item, action, nowIso);
              nextItem = nextItem ?? updated;
              return updated;
            })
            .filter((item) => shouldKeepInboxItemForQuery(item, params));

          return old.items === updatedItems ? old : { ...old, items: updatedItems };
        });
      }

      const prevItem = previousItem;
      const nextUpdatedItem = nextItem;

      if (prevItem && nextUpdatedItem) {
        queryClient.setQueryData<InboxStats | undefined>(digestKeys.inboxStats(), (old) => {
          if (!old) return old;
          return updateInboxStatsForItemChange(old, prevItem, nextUpdatedItem);
        });
      }

      return { previousQueries, previousStats };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      if (context?.previousStats) {
        queryClient.setQueryData(digestKeys.inboxStats(), context.previousStats);
      }
      toast.error(error.message || 'Failed to update item');
    },
    onSettled: () => {
      // 轻量同步：只刷新 stats，避免每次点开文章都触发全量列表重拉
      queryClient.invalidateQueries({ queryKey: digestKeys.inboxStats() });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscriptionId?: string) => api.markAllAsRead(subscriptionId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: digestKeys.inbox() });
      toast.success(`Marked ${result.markedCount} items as read`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark as read');
    },
  });
}

// ========== Run Hooks ==========

export function useRuns(subscriptionId: string, params?: RunQueryParams) {
  return useQuery({
    queryKey: [...digestKeys.runs(subscriptionId), params],
    queryFn: () => api.fetchRuns(subscriptionId, params),
    enabled: !!subscriptionId,
  });
}

// ========== Topic Hooks ==========

export function useUserTopics(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: digestKeys.topics(),
    queryFn: () => api.fetchUserTopics(),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTopicInput) => api.createTopic(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestKeys.topics() });
      queryClient.invalidateQueries({ queryKey: digestKeys.subscriptions() });
      toast.success('Topic published successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to publish topic');
    },
  });
}

export function useUpdateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTopicInput }) => api.updateTopic(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestKeys.topics() });
      toast.success('Topic updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update topic');
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteTopic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestKeys.topics() });
      toast.success('Topic deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete topic');
    },
  });
}

// ========== Public Topic Hooks (for Follow) ==========

export function usePublicTopic(slug: string) {
  return useQuery({
    queryKey: digestKeys.publicTopic(slug),
    queryFn: () => api.fetchPublicTopicBySlug(slug),
    enabled: !!slug,
  });
}

export function useFollowTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: FollowTopicInput }) =>
      api.followTopic(slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestKeys.subscriptions() });
      toast.success('Successfully subscribed to topic');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to follow topic');
    },
  });
}

// ========== Feedback Hooks ==========

export function useFeedbackSuggestions(subscriptionId: string) {
  return useQuery({
    queryKey: digestKeys.feedbackSuggestions(subscriptionId),
    queryFn: () => api.fetchFeedbackSuggestions(subscriptionId),
    enabled: !!subscriptionId,
  });
}

export function useApplyFeedbackSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      data,
    }: {
      subscriptionId: string;
      data: ApplySuggestionsInput;
    }) => api.applyFeedbackSuggestions(subscriptionId, data),
    onSuccess: (result, { subscriptionId }) => {
      queryClient.invalidateQueries({ queryKey: digestKeys.feedbackSuggestions(subscriptionId) });
      queryClient.invalidateQueries({ queryKey: digestKeys.subscription(subscriptionId) });
      toast.success(`Applied ${result.applied} suggestions`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to apply suggestions');
    },
  });
}

export function useFeedbackStats(subscriptionId: string) {
  return useQuery({
    queryKey: digestKeys.feedbackStats(subscriptionId),
    queryFn: () => api.fetchFeedbackStats(subscriptionId),
    enabled: !!subscriptionId,
  });
}
