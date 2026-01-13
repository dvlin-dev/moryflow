/**
 * Digest Hooks
 *
 * [PROVIDES]: React Query hooks for digest operations
 * [POS]: Data fetching and mutation hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from './api';
import type {
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionQueryParams,
  InboxQueryParams,
  InboxItemState,
  RunQueryParams,
  CreateTopicRequest,
  UpdateTopicRequest,
  FollowTopicRequest,
} from './types';

// ========== Query Keys ==========

export const digestKeys = {
  all: ['digest'] as const,
  subscriptions: () => [...digestKeys.all, 'subscriptions'] as const,
  subscription: (id: string) => [...digestKeys.subscriptions(), id] as const,
  inbox: () => [...digestKeys.all, 'inbox'] as const,
  inboxItems: (params?: InboxQueryParams) => [...digestKeys.inbox(), 'items', params] as const,
  inboxStats: () => [...digestKeys.inbox(), 'stats'] as const,
  runs: (subscriptionId: string) => [...digestKeys.all, 'runs', subscriptionId] as const,
  run: (subscriptionId: string, runId: string) =>
    [...digestKeys.runs(subscriptionId), runId] as const,
  runItems: (subscriptionId: string, runId: string) =>
    [...digestKeys.run(subscriptionId, runId), 'items'] as const,
  topics: () => [...digestKeys.all, 'topics'] as const,
  publicTopic: (slug: string) => [...digestKeys.all, 'public-topic', slug] as const,
};

// ========== Subscription Hooks ==========

export function useSubscriptions(params?: SubscriptionQueryParams) {
  return useQuery({
    queryKey: [...digestKeys.subscriptions(), params],
    queryFn: () => api.fetchSubscriptions(params),
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
    mutationFn: (data: CreateSubscriptionRequest) => api.createSubscription(data),
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
    mutationFn: ({ id, data }: { id: string; data: UpdateSubscriptionRequest }) =>
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

export function useInboxItems(params?: InboxQueryParams) {
  return useQuery({
    queryKey: digestKeys.inboxItems(params),
    queryFn: () => api.fetchInboxItems(params),
  });
}

export function useInboxStats() {
  return useQuery({
    queryKey: digestKeys.inboxStats(),
    queryFn: () => api.fetchInboxStats(),
  });
}

export function useUpdateInboxItemState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, state }: { id: string; state: InboxItemState }) =>
      api.updateInboxItemState(id, state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: digestKeys.inbox() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update item');
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscriptionId?: string) => api.markAllAsRead(subscriptionId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: digestKeys.inbox() });
      toast.success(`Marked ${result.count} items as read`);
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

export function useRun(subscriptionId: string, runId: string) {
  return useQuery({
    queryKey: digestKeys.run(subscriptionId, runId),
    queryFn: () => api.fetchRun(subscriptionId, runId),
    enabled: !!subscriptionId && !!runId,
  });
}

export function useRunItems(subscriptionId: string, runId: string) {
  return useQuery({
    queryKey: digestKeys.runItems(subscriptionId, runId),
    queryFn: () => api.fetchRunItems(subscriptionId, runId),
    enabled: !!subscriptionId && !!runId,
  });
}

// ========== Topic Hooks ==========

export function useUserTopics(params?: { cursor?: string; limit?: number }) {
  return useQuery({
    queryKey: [...digestKeys.topics(), params],
    queryFn: () => api.fetchUserTopics(params),
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTopicRequest) => api.createTopic(data),
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
    mutationFn: ({ id, data }: { id: string; data: UpdateTopicRequest }) =>
      api.updateTopic(id, data),
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
    mutationFn: ({ slug, data }: { slug: string; data: FollowTopicRequest }) =>
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
