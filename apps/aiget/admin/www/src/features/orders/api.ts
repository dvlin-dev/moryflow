/**
 * Orders API
 */
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import { buildUrl } from '@/lib/query-utils';
import type {
  PaginatedResponse,
  OrderListItem,
  OrderDetail,
  OrderQuery,
} from './types';

/** 获取订单列表 */
export async function getOrders(
  query: OrderQuery = {},
): Promise<PaginatedResponse<OrderListItem>> {
  const url = buildUrl(ADMIN_API.ORDERS, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
    type: query.type,
  });
  return apiClient.get<PaginatedResponse<OrderListItem>>(url);
}

/** 获取单个订单 */
export async function getOrder(id: string): Promise<OrderDetail> {
  return apiClient.get<OrderDetail>(`${ADMIN_API.ORDERS}/${id}`);
}
