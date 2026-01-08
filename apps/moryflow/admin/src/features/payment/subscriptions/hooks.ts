/**
 * 订阅 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { subscriptionsApi, type SubscriptionsQueryParams } from './api'

export const SUBSCRIPTIONS_QUERY_KEY = ['admin', 'subscriptions'] as const

export function useSubscriptions(params: Omit<SubscriptionsQueryParams, 'limit' | 'offset'> & {
  page: number
  pageSize: number
}) {
  const { page, pageSize, ...filters } = params
  return useQuery({
    queryKey: [...SUBSCRIPTIONS_QUERY_KEY, filters.status, page],
    queryFn: () =>
      subscriptionsApi.getAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        ...filters,
      }),
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (subscriptionId: string) => subscriptionsApi.cancel(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_QUERY_KEY })
      toast.success('订阅已设置为取消')
    },
    onError: (error: Error) => {
      toast.error(`取消失败: ${error.message}`)
    },
  })
}
