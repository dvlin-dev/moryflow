/**
 * Subscriptions React Query Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSubscriptions, getSubscription, updateSubscription } from './api';
import type { SubscriptionQuery, UpdateSubscriptionRequest } from './types';

const QUERY_KEY = ['admin', 'subscriptions'];

/** 获取订阅列表 */
export function useSubscriptions(query: SubscriptionQuery = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, query],
    queryFn: () => getSubscriptions(query),
  });
}

/** 获取单个订阅 */
export function useSubscription(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => getSubscription(id),
    enabled: !!id,
  });
}

/** 更新订阅 */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubscriptionRequest }) =>
      updateSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('订阅已更新');
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新失败');
    },
  });
}
