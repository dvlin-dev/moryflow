/**
 * Memory 订阅套餐常量
 */

export type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO' | 'TEAM'

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  FREE: 'Free',
  BASIC: 'Basic',
  PRO: 'Pro',
  TEAM: 'Team',
}

export const TIER_LABELS_SHORT: Record<SubscriptionTier, string> = {
  FREE: 'Free',
  BASIC: 'Basic',
  PRO: 'Pro',
  TEAM: 'Team',
}

export const TIER_COLORS: Record<SubscriptionTier, string> = {
  FREE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  BASIC: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PRO: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  TEAM: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
}

export const TIER_OPTIONS: Array<{ value: SubscriptionTier; label: string }> = [
  { value: 'FREE', label: 'Free' },
  { value: 'BASIC', label: 'Basic' },
  { value: 'PRO', label: 'Pro' },
  { value: 'TEAM', label: 'Team' },
]

/** 套餐月度配额 */
export const TIER_MONTHLY_QUOTA: Record<SubscriptionTier, number> = {
  FREE: 100,
  BASIC: 5000,
  PRO: 20000,
  TEAM: 60000,
}

/** 套餐价格（美分） */
export const TIER_PRICES: Record<SubscriptionTier, { monthly: number; yearly: number }> = {
  FREE: { monthly: 0, yearly: 0 },
  BASIC: { monthly: 900, yearly: 9000 },
  PRO: { monthly: 2900, yearly: 29000 },
  TEAM: { monthly: 7900, yearly: 79000 },
}
