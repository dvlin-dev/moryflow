/**
 * 会员信息卡片组件
 *
 * 显示用户会员等级和积分信息
 * 使用 nativewind + theme tokens 支持暗黑模式
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useThemeColors } from '@/lib/theme';
import { useMembershipUser, TIER_DISPLAY_NAMES } from '@/lib/server';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  UserIcon,
  SparklesIcon,
  ChevronRightIcon,
  CrownIcon,
  type LucideIcon,
} from 'lucide-react-native';

// 会员等级配置
type TierKey = 'free' | 'basic' | 'pro' | 'license';

interface TierConfig {
  icon: LucideIcon;
  colorKey: 'tierFree' | 'tierBasic' | 'tierPro' | 'tierLicense';
  bgClass: string;
  textClass: string;
}

const TIER_CONFIG: Record<TierKey, TierConfig> = {
  free: {
    icon: SparklesIcon,
    colorKey: 'tierFree',
    bgClass: 'bg-tier-free-bg',
    textClass: 'text-tier-free',
  },
  basic: {
    icon: SparklesIcon,
    colorKey: 'tierBasic',
    bgClass: 'bg-tier-basic-bg',
    textClass: 'text-tier-basic',
  },
  pro: {
    icon: CrownIcon,
    colorKey: 'tierPro',
    bgClass: 'bg-tier-pro-bg',
    textClass: 'text-tier-pro',
  },
  license: {
    icon: CrownIcon,
    colorKey: 'tierLicense',
    bgClass: 'bg-tier-license-bg',
    textClass: 'text-tier-license',
  },
};

interface MembershipCardProps {
  onUpgradePress?: () => void;
}

/**
 * 会员信息卡片
 * - 未登录：显示登录入口
 * - 已登录：显示会员等级和积分
 */
export function MembershipCard({ onUpgradePress }: MembershipCardProps) {
  const { user, isAuthenticated, isLoading } = useMembershipUser();
  const colors = useThemeColors();
  const { t } = useTranslation('membership');

  // 加载中显示骨架屏（优先判断，避免闪烁）
  if (isLoading && !user) {
    return (
      <View className="border-border bg-card mx-4 my-2 overflow-hidden rounded-2xl border">
        <View className="flex-row items-center gap-3 p-4">
          <View className="bg-muted h-11 w-11 rounded-xl" />
          <View className="flex-1">
            <View className="bg-muted h-4 w-24 rounded" />
            <View className="bg-muted mt-2 h-3 w-36 rounded" />
          </View>
        </View>
      </View>
    );
  }

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <Pressable
        className="border-border bg-card mx-4 my-2 overflow-hidden rounded-2xl border active:opacity-80"
        onPress={() => router.push('/(auth)/sign-in')}>
        <View className="flex-row items-center gap-3 p-4">
          <View className="bg-muted h-11 w-11 items-center justify-center rounded-xl">
            <Icon as={UserIcon} size={24} className="text-muted-foreground" />
          </View>
          <View className="flex-1">
            <Text className="text-foreground text-base font-semibold">{t('loginTitle')}</Text>
            <Text className="text-muted-foreground mt-0.5 text-sm">{t('loginSubtitle')}</Text>
          </View>
          <Icon as={ChevronRightIcon} size={20} className="text-muted-foreground" />
        </View>
      </Pressable>
    );
  }

  // 已登录状态
  const tier = (user?.subscriptionTier || 'free') as TierKey;
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const tierColor = colors[config.colorKey];
  const tierName = user?.tierInfo?.displayName || TIER_DISPLAY_NAMES[tier] || t('freeTier');
  const totalCredits = user?.credits?.total ?? 0;
  const isFree = tier === 'free';

  return (
    <View className="border-border bg-card mx-4 my-2 overflow-hidden rounded-2xl border">
      {/* 会员信息 */}
      <View className="flex-row items-center gap-3 p-4">
        <View className={cn('h-11 w-11 items-center justify-center rounded-xl', config.bgClass)}>
          <Icon as={config.icon} size={20} color={tierColor} />
        </View>
        <View className="flex-1">
          <Text className={cn('text-base font-semibold', config.textClass)}>{tierName}</Text>
          <Text className="text-muted-foreground mt-0.5 text-sm">
            {t('remainingCredits')}：{totalCredits.toLocaleString()}
          </Text>
        </View>
        {isFree && onUpgradePress && (
          <Button variant="outline" size="sm" onPress={onUpgradePress}>
            <Text className="text-primary text-sm">{t('upgrade')}</Text>
          </Button>
        )}
      </View>

      {/* 积分详情 */}
      {user?.credits && (
        <View className="border-border flex-row border-t px-4 py-3">
          <View className="flex-1 items-center">
            <Text className="text-muted-foreground mb-0.5 text-xs">{t('dailyCredits')}</Text>
            <Text className="text-foreground text-sm font-medium">{user.credits.daily}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-muted-foreground mb-0.5 text-xs">{t('subscriptionCredits')}</Text>
            <Text className="text-foreground text-sm font-medium">{user.credits.subscription}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-muted-foreground mb-0.5 text-xs">{t('purchasedCredits')}</Text>
            <Text className="text-foreground text-sm font-medium">{user.credits.purchased}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
