/**
 * [PROVIDES]: getMembershipTierConfig - 会员等级视觉配置查询
 * [DEPENDS]: @moryflow/api UserTier
 * [POS]: Mobile 端会员卡片展示配置的单一来源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { UserTier } from '@moryflow/api';
import type { ThemeColors } from '@/lib/theme';

type TierColorKey = keyof Pick<ThemeColors, 'tierFree' | 'success' | 'tierBasic' | 'tierPro'>;

export interface MembershipTierConfig {
  icon: 'sparkles' | 'crown';
  colorKey: TierColorKey;
  bgClass: string;
  textClass: string;
}

const MEMBERSHIP_TIER_CONFIG: Record<UserTier, MembershipTierConfig> = {
  free: {
    icon: 'sparkles',
    colorKey: 'tierFree',
    bgClass: 'bg-tier-free-bg',
    textClass: 'text-tier-free',
  },
  starter: {
    icon: 'sparkles',
    colorKey: 'success',
    bgClass: 'bg-success-bg',
    textClass: 'text-success',
  },
  basic: {
    icon: 'sparkles',
    colorKey: 'tierBasic',
    bgClass: 'bg-tier-basic-bg',
    textClass: 'text-tier-basic',
  },
  pro: {
    icon: 'crown',
    colorKey: 'tierPro',
    bgClass: 'bg-tier-pro-bg',
    textClass: 'text-tier-pro',
  },
};

export function getMembershipTierConfig(tier: UserTier): MembershipTierConfig {
  return MEMBERSHIP_TIER_CONFIG[tier];
}
