/**
 * [PROVIDES]: orders 相关常量与展示映射
 * [DEPENDS]: OrderStatus/OrderType 类型
 * [POS]: 供 orders 页面与子组件复用，避免状态映射重复
 */

import type { OrderStatus, OrderType } from './types';

export const ORDER_STATUS_OPTIONS: OrderStatus[] = ['pending', 'completed', 'failed', 'refunded'];
export const ORDER_TYPE_OPTIONS: OrderType[] = ['subscription', 'quota_purchase'];

export function getOrderStatusBadgeVariant(status: string): string {
  switch (status) {
    case 'completed':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'failed':
    case 'refunded':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function getOrderTypeBadgeVariant(type: string): string {
  switch (type) {
    case 'subscription':
      return 'default';
    case 'quota_purchase':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function getOrderTypeLabel(type: OrderType): string {
  return type === 'subscription' ? '订阅' : '配额购买';
}
