/**
 * DigestStatusBadge - Digest 状态徽章组件
 *
 * [PROPS]: status, type (subscription/run/topic)
 * [POS]: 用于 Digest 各种状态展示
 */

import { Badge } from '../components/badge';
import { cn } from '../lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
}

// 订阅状态
const subscriptionStatusMap: Record<string, StatusConfig> = {
  enabled: { label: 'Active', variant: 'default' },
  disabled: { label: 'Paused', variant: 'secondary' },
};

// 运行状态
const runStatusMap: Record<string, StatusConfig> = {
  PENDING: { label: 'Pending', variant: 'outline' },
  RUNNING: { label: 'Running', variant: 'secondary' },
  SUCCEEDED: { label: 'Succeeded', variant: 'default' },
  FAILED: { label: 'Failed', variant: 'destructive' },
};

// 话题状态
const topicStatusMap: Record<string, StatusConfig> = {
  ACTIVE: { label: 'Active', variant: 'default' },
  PAUSED_INSUFFICIENT_CREDITS: { label: 'Paused (Credits)', variant: 'secondary' },
  PAUSED_BY_ADMIN: { label: 'Paused (Admin)', variant: 'destructive' },
};

// 话题可见性
const topicVisibilityMap: Record<string, StatusConfig> = {
  PUBLIC: { label: 'Public', variant: 'default' },
  UNLISTED: { label: 'Unlisted', variant: 'secondary' },
  PRIVATE: { label: 'Private', variant: 'outline' },
};

export type DigestStatusType = 'subscription' | 'run' | 'topic' | 'visibility';

export interface DigestStatusBadgeProps {
  status: string | boolean;
  type: DigestStatusType;
  className?: string;
}

export function DigestStatusBadge({ status, type, className }: DigestStatusBadgeProps) {
  let config: StatusConfig | undefined;

  switch (type) {
    case 'subscription':
      config = subscriptionStatusMap[status ? 'enabled' : 'disabled'];
      break;
    case 'run':
      config = runStatusMap[status as string];
      break;
    case 'topic':
      config = topicStatusMap[status as string];
      break;
    case 'visibility':
      config = topicVisibilityMap[status as string];
      break;
  }

  return (
    <Badge variant={config?.variant ?? 'outline'} className={cn(className)}>
      {config?.label ?? String(status)}
    </Badge>
  );
}
