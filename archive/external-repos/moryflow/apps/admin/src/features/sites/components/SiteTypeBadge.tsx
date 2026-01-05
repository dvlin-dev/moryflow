/**
 * SiteTypeBadge - 站点类型徽章
 */

import { Badge } from '@/components/ui/badge'
import { FileText, Sparkles } from 'lucide-react'
import type { SiteType } from '../types'

export interface SiteTypeBadgeProps {
  type: SiteType
  className?: string
}

const typeConfig: Record<
  SiteType,
  { label: string; icon: typeof FileText; variant: 'default' | 'secondary' | 'outline' }
> = {
  MARKDOWN: { label: 'Markdown', icon: FileText, variant: 'outline' },
  GENERATED: { label: 'AI 生成', icon: Sparkles, variant: 'secondary' },
}

export function SiteTypeBadge({ type, className }: SiteTypeBadgeProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  )
}
