/**
 * [PROVIDES]: subscription query + mutation hooks
 * [POS]: digest subscriptions domain hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from '../api';
import type {
  CreateSubscriptionInput,
  SubscriptionQueryParams,
  UpdateSubscriptionInput,
} from '../types';
import { resolveMutationErrorMessage } from './error-message';
import { digestKeys } from './query-keys';

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
    enabled: Boolean(id),
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
    onError: (error) => {
      toast.error(resolveMutationErrorMessage(error, 'Failed to create subscription'));
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
    onError: (error) => {
      toast.error(resolveMutationErrorMessage(error, 'Failed to update subscription'));
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
    onError: (error) => {
      toast.error(resolveMutationErrorMessage(error, 'Failed to delete subscription'));
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
    onError: (error) => {
      toast.error(resolveMutationErrorMessage(error, 'Failed to toggle subscription'));
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
    onError: (error) => {
      toast.error(resolveMutationErrorMessage(error, 'Failed to trigger run'));
    },
  });
}
