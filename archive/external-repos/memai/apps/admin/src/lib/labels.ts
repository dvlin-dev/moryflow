/**
 * 显示标签工具函数
 * 统一管理各种枚举值的显示文本
 */

import type { OrderType, OrderStatus } from '@/features/orders';

/** 订单类型标签映射 */
const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  subscription: '订阅',
  usage_billing: '用量计费',
};

/** 订单状态标签映射 */
const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待处理',
  completed: '已完成',
  failed: '失败',
  refunded: '已退款',
};

/**
 * 获取订单类型的显示文本
 */
export function getOrderTypeLabel(type: OrderType): string {
  return ORDER_TYPE_LABELS[type] ?? type;
}

/**
 * 获取订单状态的显示文本
 */
export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}
