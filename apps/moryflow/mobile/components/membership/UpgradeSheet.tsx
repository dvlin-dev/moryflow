/**
 * 升级引导弹窗
 *
 * 当用户点击锁定模型或需要升级时显示
 * 使用 nativewind + theme tokens 支持暗黑模式
 */

import React from 'react';
import { View, Linking, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import { useMembershipUser, TIER_DISPLAY_NAMES, MEMBERSHIP_API_URL } from '@/lib/server';
import { useTranslation } from '@/lib/i18n';
import type { UnifiedModel } from '@/lib/models';
import { XIcon, CrownIcon, SparklesIcon, CheckIcon, LogInIcon } from '@/components/ui/icons';

// 升级网站地址（基于 API URL 推导）
const UPGRADE_URL = MEMBERSHIP_API_URL.replace('/api', '').replace('api.', '') + '/pricing';

interface UpgradeSheetProps {
  /** 触发升级的模型（可选） */
  model?: UnifiedModel | null;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 升级引导弹窗
 * - 显示当前会员等级
 * - 展示升级后的权益
 * - 提供升级入口
 */
export function UpgradeSheet({ model, onClose }: UpgradeSheetProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { user, isAuthenticated } = useMembershipUser();
  const { t } = useTranslation('membership');

  const currentTier = user?.subscriptionTier || 'free';
  const currentTierName =
    user?.tierInfo?.displayName || TIER_DISPLAY_NAMES[currentTier] || t('freeTier');
  const requiredTier = model?.meta?.minTier;
  const requiredTierName = requiredTier ? TIER_DISPLAY_NAMES[requiredTier] : null;

  const handleUpgrade = () => {
    Linking.openURL(UPGRADE_URL);
  };

  const handleLogin = () => {
    onClose();
    router.push('/(auth)/sign-in');
  };

  // 升级权益列表
  const benefits = [t('benefit1'), t('benefit2'), t('benefit3')];

  return (
    <View className="bg-background flex-1">
      {/* Header - 使用 style 处理动态 insets */}
      <View style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-foreground text-lg font-semibold">
            {isAuthenticated ? t('upgradeTitle') : t('loginRequired')}
          </Text>
          <Pressable
            className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
            onPress={onClose}>
            <Icon as={XIcon} size={22} className="text-foreground" />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-5">
        {/* 提示信息 */}
        {model && (
          <View className="bg-muted mb-6 rounded-xl p-4">
            <Text className="text-foreground text-center text-base leading-6">
              <Text className="font-semibold">{model.name}</Text>
              {requiredTierName ? (
                <Text>
                  {' '}
                  {t('requiresTier')} <Text className="text-primary">{requiredTierName}</Text>{' '}
                  {t('orAbove')}
                </Text>
              ) : (
                <Text> {t('requiresHigherTier')}</Text>
              )}
            </Text>
          </View>
        )}

        {/* 当前状态 */}
        <View className="mb-6">
          <Text className="text-muted-foreground mb-2 text-sm">{t('currentTier')}</Text>
          <View className="flex-row items-center gap-3">
            <View className="bg-muted h-9 w-9 items-center justify-center rounded-lg">
              <Icon as={SparklesIcon} size={18} className="text-muted-foreground" />
            </View>
            <Text className="text-foreground text-base font-medium">
              {isAuthenticated ? currentTierName : t('notLoggedIn')}
            </Text>
          </View>
        </View>

        {/* 升级权益（仅已登录用户显示） */}
        {isAuthenticated && (
          <View className="mb-8">
            <Text className="text-foreground mb-4 text-base font-semibold">
              {t('benefitsTitle')}
            </Text>
            {benefits.map((text, index) => (
              <View key={index} className="mb-3.5 flex-row items-center gap-3">
                <View className="bg-primary/15 h-6 w-6 items-center justify-center rounded-md">
                  <Icon as={CheckIcon} size={14} className="text-primary" />
                </View>
                <Text className="text-foreground text-base">{text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 操作按钮 - 使用 style 处理动态 insets */}
        <View style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mt-auto pt-4">
            {isAuthenticated ? (
              // 已登录：显示升级按钮
              <Button
                variant="default"
                size="lg"
                onPress={handleUpgrade}
                className="h-12 flex-row items-center justify-center gap-2 rounded-xl">
                <Icon as={CrownIcon} size={18} color={colors.textInverse} />
                <Text className="text-primary-foreground text-base font-semibold">
                  {t('viewPlans')}
                </Text>
              </Button>
            ) : (
              // 未登录：显示登录按钮
              <Button
                variant="default"
                size="lg"
                onPress={handleLogin}
                className="h-12 flex-row items-center justify-center gap-2 rounded-xl">
                <Icon as={LogInIcon} size={18} color={colors.textInverse} />
                <Text className="text-primary-foreground text-base font-semibold">
                  {t('loginNow')}
                </Text>
              </Button>
            )}
            <Pressable className="items-center py-4 active:opacity-70" onPress={onClose}>
              <Text className="text-muted-foreground text-sm">{t('later')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
