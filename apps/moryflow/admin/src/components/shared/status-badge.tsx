/**
 * [PROPS]: StatusBadgeProps - 状态徽章渲染所需配置
 * [EMITS]: none
 * [POS]: 状态徽章组件与状态配置常量
 */

import { Badge } from '@/components/ui/badge';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface StatusConfig {
  label: string;
  variant: BadgeVariant;
}

interface StatusBadgeProps {
  status: string;
  configMap: Record<string, StatusConfig>;
  fallbackVariant?: BadgeVariant;
}

export function StatusBadge({ status, configMap, fallbackVariant = 'outline' }: StatusBadgeProps) {
  const config = configMap[status];
  return <Badge variant={config?.variant ?? fallbackVariant}>{config?.label ?? status}</Badge>;
}

// 预定义的状态配置
export const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: '待支付', variant: 'outline' },
  completed: { label: '已完成', variant: 'default' },
  refunded: { label: '已退款', variant: 'secondary' },
  failed: { label: '失败', variant: 'destructive' },
};

export const SUBSCRIPTION_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: { label: '活跃', variant: 'default' },
  canceled: { label: '已取消', variant: 'secondary' },
  unpaid: { label: '未支付', variant: 'destructive' },
  scheduled_cancel: { label: '待取消', variant: 'outline' },
  trialing: { label: '试用中', variant: 'outline' },
};

export const LICENSE_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: { label: '有效', variant: 'default' },
  revoked: { label: '已撤销', variant: 'destructive' },
};
