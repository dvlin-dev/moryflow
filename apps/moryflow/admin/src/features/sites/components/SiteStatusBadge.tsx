/**
 * SiteStatusBadge - 站点状态徽章
 */

import { Badge } from '@/components/ui/badge'
import type { SiteStatus } from '../types'

export interface SiteStatusBadgeProps {
  status: SiteStatus
  className?: string
}

const statusConfig: Record<
  SiteStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  ACTIVE: { label: '活跃', variant: 'default' },
  OFFLINE: { label: '下线', variant: 'secondary' },
}

export function SiteStatusBadge({ status, className }: SiteStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
