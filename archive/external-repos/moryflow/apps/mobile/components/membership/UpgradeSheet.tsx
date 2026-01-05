/**
 * 升级引导弹窗
 *
 * 当用户点击锁定模型或需要升级时显示
 * 使用 nativewind + theme tokens 支持暗黑模式
 */

import React from 'react'
import { View, Linking, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui/text'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useThemeColors } from '@/lib/theme'
import { useMembershipUser, TIER_DISPLAY_NAMES, MEMBERSHIP_API_URL } from '@/lib/server'
import { useTranslation } from '@/lib/i18n'
import type { UnifiedModel } from '@/lib/models'
import {
  XIcon,
  CrownIcon,
  SparklesIcon,
  CheckIcon,
  LogInIcon,
} from 'lucide-react-native'

// 升级网站地址（基于 API URL 推导）
const UPGRADE_URL = MEMBERSHIP_API_URL.replace('/api', '').replace('api.', '') + '/pricing'

interface UpgradeSheetProps {
  /** 触发升级的模型（可选） */
  model?: UnifiedModel | null
  /** 关闭回调 */
  onClose: () => void
}

/**
 * 升级引导弹窗
 * - 显示当前会员等级
 * - 展示升级后的权益
 * - 提供升级入口
 */
export function UpgradeSheet({ model, onClose }: UpgradeSheetProps) {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const { user, isAuthenticated } = useMembershipUser()
  const { t } = useTranslation('membership')

  const currentTier = user?.tier || 'free'
  const currentTierName = user?.tierInfo?.displayName || TIER_DISPLAY_NAMES[currentTier] || t('freeTier')
  const requiredTier = model?.meta?.minTier
  const requiredTierName = requiredTier ? TIER_DISPLAY_NAMES[requiredTier] : null

  const handleUpgrade = () => {
    Linking.openURL(UPGRADE_URL)
  }

  const handleLogin = () => {
    onClose()
    router.push('/(auth)/sign-in')
  }

  // 升级权益列表
  const benefits = [
    t('benefit1'),
    t('benefit2'),
    t('benefit3'),
  ]

  return (
    <View className="flex-1 bg-background">
      {/* Header - 使用 style 处理动态 insets */}
      <View style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-lg font-semibold text-foreground">
            {isAuthenticated ? t('upgradeTitle') : t('loginRequired')}
          </Text>
          <Pressable
            className="w-10 h-10 items-center justify-center rounded-full active:bg-muted"
            onPress={onClose}
          >
            <Icon as={XIcon} size={22} className="text-foreground" />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-5">
        {/* 提示信息 */}
        {model && (
          <View className="p-4 rounded-xl bg-muted mb-6">
            <Text className="text-base text-foreground text-center leading-6">
              <Text className="font-semibold">{model.name}</Text>
              {requiredTierName ? (
                <Text>
                  {' '}{t('requiresTier')}{' '}
                  <Text className="text-primary">{requiredTierName}</Text>
                  {' '}{t('orAbove')}
                </Text>
              ) : (
                <Text> {t('requiresHigherTier')}</Text>
              )}
            </Text>
          </View>
        )}

        {/* 当前状态 */}
        <View className="mb-6">
          <Text className="text-sm text-muted-foreground mb-2">
            {t('currentTier')}
          </Text>
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-lg bg-muted items-center justify-center">
              <Icon as={SparklesIcon} size={18} className="text-muted-foreground" />
            </View>
            <Text className="text-base font-medium text-foreground">
              {isAuthenticated ? currentTierName : t('notLoggedIn')}
            </Text>
          </View>
        </View>

        {/* 升级权益（仅已登录用户显示） */}
        {isAuthenticated && (
          <View className="mb-8">
            <Text className="text-base font-semibold text-foreground mb-4">
              {t('benefitsTitle')}
            </Text>
            {benefits.map((text, index) => (
              <View key={index} className="flex-row items-center gap-3 mb-3.5">
                <View className="w-6 h-6 rounded-md bg-primary/15 items-center justify-center">
                  <Icon as={CheckIcon} size={14} className="text-primary" />
                </View>
                <Text className="text-base text-foreground">{text}</Text>
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
              className="flex-row items-center justify-center gap-2 h-12 rounded-xl"
            >
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
              className="flex-row items-center justify-center gap-2 h-12 rounded-xl"
            >
              <Icon as={LogInIcon} size={18} color={colors.textInverse} />
              <Text className="text-primary-foreground text-base font-semibold">
                {t('loginNow')}
              </Text>
            </Button>
          )}
          <Pressable className="items-center py-4 active:opacity-70" onPress={onClose}>
            <Text className="text-sm text-muted-foreground">{t('later')}</Text>
          </Pressable>
          </View>
        </View>
      </View>
    </View>
  )
}
