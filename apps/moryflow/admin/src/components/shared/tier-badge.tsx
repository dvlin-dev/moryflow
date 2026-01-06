/**
 * TierBadge - 用户等级徽章组件
 * 使用 shadcn Badge 组件重写
 */
import { Badge } from '@/components/ui/badge'
import type { UserTier } from '@/types/api'
import { TIER_LABELS, TIER_LABELS_SHORT } from '@/constants'

export interface TierBadgeProps {
  tier: UserTier
  /** 使用短标签 */
  short?: boolean
  className?: string
}

const tierVariants: Record<UserTier, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  free: 'secondary',
  starter: 'outline',
  basic: 'outline',
  pro: 'default',
  license: 'default',
}

export function TierBadge({ tier, short = false, className }: TierBadgeProps) {
  const label = short ? TIER_LABELS_SHORT[tier] : TIER_LABELS[tier]

  return (
    <Badge variant={tierVariants[tier]} className={className}>
      {label}
    </Badge>
  )
}
