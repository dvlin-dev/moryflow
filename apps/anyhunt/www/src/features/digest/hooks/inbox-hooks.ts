/**
 * [PROVIDES]: inbox query + mutation hooks
 * [POS]: digest inbox domain hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from '../api';
import {
  applyInboxItemAction,
  shouldKeepInboxItemForQuery,
  updateInboxStatsForItemChange,
} from '../mappers/inbox-item-state';
import type { InboxItem, InboxItemAction, InboxQueryParams, InboxStats, PaginatedResponse } from '../types';
import { resolveMutationErrorMessage } from './error-message';
import { digestKeys } from './query-keys';

export function useInboxItemContent(itemId: string | null) {
  return useQuery({
    queryKey: digestKeys.inboxItemContent(itemId ?? ''),
    queryFn: () => {
      if (!itemId) {
        throw new Error('Item ID is required');
      }
      return api.fetchInboxItemContent(itemId);
    },
    enabled: Boolean(itemId),
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
        if (!Array.isArray(queryKey)) {
          continue;
        }
        if (queryKey[2] !== 'items') {
          continue;
        }

        const params = queryKey[3] as InboxQueryParams | undefined;

        queryClient.setQueryData<PaginatedResponse<InboxItem> | undefined>(queryKey, (old) => {
          if (!old) {
            return old;
          }

          let hasMatchedItem = false;
          const nextItems: InboxItem[] = [];

          for (const item of old.items) {
            if (item.id !== id) {
              nextItems.push(item);
              continue;
            }

            hasMatchedItem = true;
            previousItem = previousItem ?? item;

            const updatedItem = applyInboxItemAction(item, action, nowIso);
            nextItem = nextItem ?? updatedItem;

            if (shouldKeepInboxItemForQuery(updatedItem, params)) {
              nextItems.push(updatedItem);
            }
          }

          if (!hasMatchedItem) {
            return old;
          }

          return {
            ...old,
            items: nextItems,
          };
        });
      }

      const prevItem = previousItem;
      const nextUpdatedItem = nextItem;

      if (prevItem && nextUpdatedItem) {
        queryClient.setQueryData<InboxStats | undefined>(digestKeys.inboxStats(), (old) => {
          if (!old) {
            return old;
          }
          return updateInboxStatsForItemChange(old, prevItem, nextUpdatedItem);
        });
      }

      return { previousQueries, previousStats };
    },
    onError: (error, _vars, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      if (context?.previousStats) {
        queryClient.setQueryData(digestKeys.inboxStats(), context.previousStats);
      }
      toast.error(resolveMutationErrorMessage(error, 'Failed to update item'));
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
    onError: (error) => {
      toast.error(resolveMutationErrorMessage(error, 'Failed to mark as read'));
    },
  });
}
