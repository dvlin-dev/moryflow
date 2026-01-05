/**
 * Orders React Query Hooks
 */
import { useQuery } from '@tanstack/react-query';
import { getOrders, getOrder } from './api';
import type { OrderQuery } from './types';

/** Query Key 工厂 */
export const orderKeys = {
  all: ['admin', 'orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (query?: OrderQuery) => [...orderKeys.lists(), query] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

/** 获取订单列表 */
export function useOrders(query: OrderQuery = {}) {
  return useQuery({
    queryKey: orderKeys.list(query),
    queryFn: () => getOrders(query),
  });
}

/** 获取单个订单 */
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => getOrder(id),
    enabled: !!id,
  });
}
