/**
 * SiteTypeBadge - 站点类型徽章
 */

import { Badge } from '@/components/ui/badge';
import { AiMagicIcon, File01Icon } from '@hugeicons/core-free-icons';
import type { SiteType } from '../types';
import { Icon, type HugeIcon } from '@/components/ui/icon';

export interface SiteTypeBadgeProps {
  type: SiteType;
  className?: string;
}

const typeConfig: Record<
  SiteType,
  { label: string; icon: HugeIcon; variant: 'default' | 'secondary' | 'outline' }
> = {
  MARKDOWN: { label: 'Markdown', icon: File01Icon, variant: 'outline' },
  GENERATED: { label: 'AI 生成', icon: AiMagicIcon, variant: 'secondary' },
};

export function SiteTypeBadge({ type, className }: SiteTypeBadgeProps) {
  const config = typeConfig[type];

  return (
    <Badge variant={config.variant} className={className}>
      <Icon icon={config.icon} className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
