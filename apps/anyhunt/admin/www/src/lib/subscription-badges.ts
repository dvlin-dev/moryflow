/**
 * [PROVIDES]: 订阅层级/状态的 badge 展示映射
 * [DEPENDS]: none
 * [POS]: users/subscriptions 场景共享，避免重复 switch 逻辑
 */

export function getSubscriptionTierBadgeVariant(tier: string): string {
  switch (tier) {
    case 'PRO':
    case 'TEAM':
      return 'default';
    case 'BASIC':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function getSubscriptionStatusBadgeVariant(status: string): string {
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
