/**
 * [PROPS]: type, className
 * [EMITS]: none
 * [POS]: SiteTypeBadge - 站点类型徽章（Lucide icons direct render）
 */

import { Badge } from '@/components/ui/badge';
import { Sparkles, File, type LucideIcon } from 'lucide-react';
import type { SiteType } from '../types';

export interface SiteTypeBadgeProps {
  type: SiteType;
  className?: string;
}

const typeConfig: Record<
  SiteType,
  { label: string; icon: LucideIcon; variant: 'default' | 'secondary' | 'outline' }
> = {
  MARKDOWN: { label: 'Markdown', icon: File, variant: 'outline' },
  GENERATED: { label: 'AI 生成', icon: Sparkles, variant: 'secondary' },
};

export function SiteTypeBadge({ type, className }: SiteTypeBadgeProps) {
  const config = typeConfig[type];
  const IconComponent = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <IconComponent className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
