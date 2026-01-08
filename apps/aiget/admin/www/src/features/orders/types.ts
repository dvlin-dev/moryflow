/**
 * Orders 类型定义
 */
export type { ApiResponse, Pagination, PaginatedResponse } from '@/lib/types';

/** 订单类型 */
export type OrderType = 'subscription' | 'quota_purchase';

/** 订单状态 */
export type OrderStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/** 订单列表项 */
export interface OrderListItem {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  creemOrderId: string;
  type: OrderType;
  amount: number;
  currency: string;
  status: OrderStatus;
  quotaAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

/** 订单详情 */
export interface OrderDetail extends OrderListItem {
  metadata: Record<string, unknown> | null;
}

/** 订单查询参数 */
export interface OrderQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  type?: OrderType;
}
