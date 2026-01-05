/**
 * Orders React Query Hooks
 */
import { useQuery } from '@tanstack/react-query';
import { getOrders, getOrder } from './api';
import type { OrderQuery } from './types';

const QUERY_KEY = ['admin', 'orders'];

/** 获取订单列表 */
export function useOrders(query: OrderQuery = {}) {
  return useQuery({
    queryKey: [...QUERY_KEY, query],
    queryFn: () => getOrders(query),
  });
}

/** 获取单个订单 */
export function useOrder(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => getOrder(id),
    enabled: !!id,
  });
}
