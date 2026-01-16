/**
 * Digest Topics Hooks
 *
 * [PROVIDES]: React Query hooks for topic operations
 * [POS]: Data fetching and mutation hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from './api';
import type { TopicQuery, SetFeaturedInput, ReorderFeaturedInput } from './types';

export const topicKeys = {
  all: ['admin', 'digest-topics'] as const,
  list: (params?: TopicQuery) => [...topicKeys.all, 'list', params] as const,
  featured: () => [...topicKeys.all, 'featured'] as const,
  detail: (id: string) => [...topicKeys.all, 'detail', id] as const,
};

export function useTopics(params?: TopicQuery) {
  return useQuery({
    queryKey: topicKeys.list(params),
    queryFn: () => api.fetchTopics(params),
  });
}

export function useFeaturedTopics() {
  return useQuery({
    queryKey: topicKeys.featured(),
    queryFn: () => api.fetchFeaturedTopics(),
  });
}

export function useTopic(id: string) {
  return useQuery({
    queryKey: topicKeys.detail(id),
    queryFn: () => api.fetchTopic(id),
    enabled: !!id,
  });
}

export function useSetFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SetFeaturedInput }) =>
      api.setFeatured(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: topicKeys.all });
      const action = variables.input.featured ? 'added to' : 'removed from';
      toast.success(`Topic ${action} featured`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update featured status');
    },
  });
}

export function useReorderFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReorderFeaturedInput) => api.reorderFeatured(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: topicKeys.all });
      toast.success('Featured order updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reorder featured topics');
    },
  });
}
