/**
 * StatusBadge - 状态徽章组件
 */
import { Badge } from '../primitives/badge'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

export interface StatusConfig {
  label: string
  variant: BadgeVariant
}

export interface StatusBadgeProps {
  status: string
  configMap: Record<string, StatusConfig>
  fallbackVariant?: BadgeVariant
}

export function StatusBadge({
  status,
  configMap,
  fallbackVariant = 'outline',
}: StatusBadgeProps) {
  const config = configMap[status]
  return (
    <Badge variant={config?.variant ?? fallbackVariant}>
      {config?.label ?? status}
    </Badge>
  )
}
