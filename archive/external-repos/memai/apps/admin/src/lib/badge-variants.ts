/**
 * Badge 变体工具函数
 * 统一管理各种状态的 Badge 显示样式
 */

import type { SubscriptionTier, SubscriptionStatus } from './subscription.types';
import type { OrderType, OrderStatus } from '@/features/orders';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

/**
 * 获取订阅层级的 Badge 变体
 */
export function getTierBadgeVariant(tier: SubscriptionTier): BadgeVariant {
  switch (tier) {
    case 'ENTERPRISE':
      return 'default';
    case 'HOBBY':
      return 'secondary';
    case 'FREE':
    default:
      return 'outline';
  }
}

/**
 * 获取订阅状态的 Badge 变体
 */
export function getSubscriptionStatusBadgeVariant(
  status: SubscriptionStatus,
): BadgeVariant {
  switch (status) {
    case 'ACTIVE':
      return 'default';
    case 'CANCELED':
      return 'secondary';
    case 'PAST_DUE':
    case 'EXPIRED':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * 获取订单状态的 Badge 变体
 */
export function getOrderStatusBadgeVariant(status: OrderStatus): BadgeVariant {
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

/**
 * 获取订单类型的 Badge 变体
 */
export function getOrderTypeBadgeVariant(type: OrderType): BadgeVariant {
  switch (type) {
    case 'subscription':
      return 'default';
    case 'usage_billing':
      return 'secondary';
    default:
      return 'outline';
  }
}
