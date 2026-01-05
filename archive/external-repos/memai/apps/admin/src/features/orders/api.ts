/**
 * Orders API
 */
import { apiClient, type PaginatedResult } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type {
  OrderListItem,
  OrderDetail,
  OrderQuery,
} from './types';

/** 构建查询字符串 */
function buildQueryString(query: OrderQuery): string {
  const params = new URLSearchParams();
  if (query.offset !== undefined) params.set('offset', String(query.offset));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.type) params.set('type', query.type);
  return params.toString();
}

/** 获取订单列表 */
export async function getOrders(
  query: OrderQuery = {},
): Promise<PaginatedResult<OrderListItem>> {
  const qs = buildQueryString(query);
  const url = qs ? `${ADMIN_API.ORDERS}?${qs}` : ADMIN_API.ORDERS;
  return apiClient.getPaginated<OrderListItem>(url);
}

/** 获取单个订单 */
export async function getOrder(id: string): Promise<OrderDetail> {
  return apiClient.get<OrderDetail>(`${ADMIN_API.ORDERS}/${id}`);
}
