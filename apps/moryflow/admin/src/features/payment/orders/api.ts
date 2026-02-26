/**
 * 订单 API
 */
import { adminApi } from '@/lib/api'
import type { OrderListResponse, PaymentOrder } from '@/types/payment'
import { buildOrdersListPath } from './query-paths'

export interface OrdersQueryParams {
  limit: number
  offset: number
  status?: string
  productType?: string
}

export const ordersApi = {
  /** 获取订单列表 */
  getAll: (params: OrdersQueryParams): Promise<OrderListResponse> =>
    adminApi.get(buildOrdersListPath(params)),

  /** 获取订单详情 */
  getById: (id: string): Promise<{ order: PaymentOrder }> =>
    adminApi.get(`/payment/orders/${id}`),
}
