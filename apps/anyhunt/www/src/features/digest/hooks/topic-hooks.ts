/**
 * [PROVIDES]: topic query + mutation hooks
 * [POS]: digest topics domain hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from '../api';
import type { CreateTopicInput, FollowTopicInput, UpdateTopicInput } from '../types';
import { resolveMutationErrorMessage } from './error-message';
import { digestKeys } from './query-keys';

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
    onError: (error) => {
      toast.error(resolveMutationErrorMessage(error, 'Failed to publish topic'));
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
    onError: (error) => {
      toast.error(resolveMutationErrorMessage(error, 'Failed to update topic'));
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
    onError: (error) => {
      toast.error(resolveMutationErrorMessage(error, 'Failed to delete topic'));
    },
  });
}

export function usePublicTopic(slug: string) {
  return useQuery({
    queryKey: digestKeys.publicTopic(slug),
    queryFn: () => api.fetchPublicTopicBySlug(slug),
    enabled: Boolean(slug),
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
    onError: (error) => {
      toast.error(resolveMutationErrorMessage(error, 'Failed to follow topic'));
    },
  });
}
