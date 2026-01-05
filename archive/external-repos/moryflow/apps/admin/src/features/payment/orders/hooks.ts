/**
 * 订单 Hooks
 */
import { useQuery } from '@tanstack/react-query'
import { ordersApi, type OrdersQueryParams } from './api'

export const ORDERS_QUERY_KEY = ['admin', 'orders'] as const

export function useOrders(params: Omit<OrdersQueryParams, 'limit' | 'offset'> & {
  page: number
  pageSize: number
}) {
  const { page, pageSize, ...filters } = params
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, filters.status, filters.productType, page],
    queryFn: () =>
      ordersApi.getAll({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        ...filters,
      }),
  })
}
