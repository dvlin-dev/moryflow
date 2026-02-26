/**
 * [PROVIDES]: feedback query + mutation hooks
 * [POS]: digest feedback domain hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from '../api';
import type { ApplySuggestionsInput } from '../types';
import { resolveMutationErrorMessage } from './error-message';
import { digestKeys } from './query-keys';

export function useFeedbackSuggestions(subscriptionId: string) {
  return useQuery({
    queryKey: digestKeys.feedbackSuggestions(subscriptionId),
    queryFn: () => api.fetchFeedbackSuggestions(subscriptionId),
    enabled: Boolean(subscriptionId),
  });
}

export function useApplyFeedbackSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subscriptionId, data }: { subscriptionId: string; data: ApplySuggestionsInput }) =>
      api.applyFeedbackSuggestions(subscriptionId, data),
    onSuccess: (result, { subscriptionId }) => {
      queryClient.invalidateQueries({ queryKey: digestKeys.feedbackSuggestions(subscriptionId) });
      queryClient.invalidateQueries({ queryKey: digestKeys.subscription(subscriptionId) });
      toast.success(`Applied ${result.applied} suggestions`);
    },
    onError: (error) => {
      toast.error(resolveMutationErrorMessage(error, 'Failed to apply suggestions'));
    },
  });
}

export function useFeedbackStats(subscriptionId: string) {
  return useQuery({
    queryKey: digestKeys.feedbackStats(subscriptionId),
    queryFn: () => api.fetchFeedbackStats(subscriptionId),
    enabled: Boolean(subscriptionId),
  });
}
