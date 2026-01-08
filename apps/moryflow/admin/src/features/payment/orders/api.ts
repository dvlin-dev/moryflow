/**
 * 订单 API
 */
import { adminApi } from '@/lib/api'
import type { OrderListResponse, PaymentOrder } from '@/types/payment'

export interface OrdersQueryParams {
  limit: number
  offset: number
  status?: string
  productType?: string
}

export const ordersApi = {
  /** 获取订单列表 */
  getAll: (params: OrdersQueryParams): Promise<OrderListResponse> => {
    const searchParams = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
    })
    if (params.status && params.status !== 'all') {
      searchParams.set('status', params.status)
    }
    if (params.productType && params.productType !== 'all') {
      searchParams.set('productType', params.productType)
    }
    return adminApi.get(`/payment/orders?${searchParams}`)
  },

  /** 获取订单详情 */
  getById: (id: string): Promise<{ order: PaymentOrder }> =>
    adminApi.get(`/payment/orders/${id}`),
}
