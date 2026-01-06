/**
 * Orders 类型定义
 */
export type { PaginatedResponse } from '@/lib/types';

/** 订单类型 - 与 Prisma Schema 保持一致 */
export type OrderType = 'subscription' | 'usage_billing';

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
  /** 金额（单位：分） */
  amount: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

/** 订单详情 */
export interface OrderDetail extends OrderListItem {
  metadata: Record<string, unknown> | null;
}

/** 订单查询参数 */
export interface OrderQuery {
  offset?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  type?: OrderType;
}
