/**
 * [PROPS]: 无
 * [EMITS]: 无
 * [POS]: 云同步设置页面，iOS 原生风格
 */

import { View, ScrollView, Pressable, ActivityIndicator, Switch } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui/text'
import { Icon } from '@/components/ui/icon'
import { useThemeColors } from '@/lib/theme'
import { useCloudSync, cloudSyncApi, formatStorageSize, formatLastSyncTime } from '@/lib/cloud-sync'
import { useUser } from '@/lib/contexts/auth.context'
import { useAuthGuard } from '@/lib/contexts/auth-guard.context'
import { useTranslation } from '@anyhunt/i18n'
import {
  CloudIcon,
  RefreshCwIcon,
  CloudOffIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  HardDriveIcon,
  SparklesIcon,
} from 'lucide-react-native'
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { UsageResponse } from '@anyhunt/api/cloud-sync'
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  useSharedValue,
} from 'react-native-reanimated'
import {
  SettingsGroup,
  SettingsRow,
  SettingsSeparator,
} from '@/components/settings'

export default function CloudSyncSettingsScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const { isSignedIn } = useUser()
  const { requireAuth } = useAuthGuard()
  const { t } = useTranslation('settings')

  const {
    status,
    isSyncing,
    isEnabled,
    hasError,
    error,
    lastSyncAt,
    vaultName,
    settings,
    triggerSync,
    updateSettings,
  } = useCloudSync()

  const [usage, setUsage] = useState<UsageResponse | null>(null)
  const [isLoadingUsage, setIsLoadingUsage] = useState(false)

  const syncEnabled = settings?.syncEnabled ?? false
  const vectorizeEnabled = settings?.vectorizeEnabled ?? false

  // 旋转动画
  const rotation = useSharedValue(0)

  useEffect(() => {
    if (isSyncing) {
      rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1, false)
    } else {
      cancelAnimation(rotation)
      rotation.value = 0
    }
  }, [isSyncing, rotation])

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  // 加载用量数据
  const loadUsage = useCallback(async () => {
    if (!isSignedIn || !isEnabled) return
    setIsLoadingUsage(true)
    try {
      const data = await cloudSyncApi.getUsage()
      setUsage(data)
    } catch (err) {
      console.error('[CloudSync] Failed to load usage:', err)
    } finally {
      setIsLoadingUsage(false)
    }
  }, [isSignedIn, isEnabled])

  useEffect(() => {
    loadUsage()
  }, [loadUsage])

  const lastSyncText = useMemo(() => formatLastSyncTime(lastSyncAt), [lastSyncAt])

  const statusInfo = useMemo(() => {
    if (isSyncing) {
      return { text: t('cloudSyncSyncing'), icon: RefreshCwIcon, color: colors.primary }
    }
    if (hasError) {
      return { text: error || t('cloudSyncFailed'), icon: AlertCircleIcon, color: colors.error }
    }
    if (!isEnabled || status === 'disabled') {
      return { text: t('cloudSyncNotEnabled'), icon: CloudOffIcon, color: colors.textTertiary }
    }
    if (status === 'offline') {
      return { text: t('cloudSyncOffline'), icon: CloudOffIcon, color: colors.warning }
    }
    return { text: t('cloudSyncSynced'), icon: CheckCircleIcon, color: colors.success }
  }, [isSyncing, hasError, isEnabled, status, error, colors, t])

  const handleToggleSync = useCallback(
    async (value: boolean) => {
      if (value && !isSignedIn) {
        requireAuth('enable_cloud_sync', () => {
          updateSettings({ syncEnabled: true })
        })
        return
      }
      await updateSettings({ syncEnabled: value })
    },
    [isSignedIn, requireAuth, updateSettings]
  )

  const handleToggleVectorize = useCallback(
    async (value: boolean) => {
      await updateSettings({ vectorizeEnabled: value })
    },
    [updateSettings]
  )

  const handleManualSync = useCallback(() => {
    if (!isSignedIn) {
      requireAuth('manual_sync', triggerSync)
      return
    }
    triggerSync()
  }, [isSignedIn, requireAuth, triggerSync])

  return (
    <View className="flex-1 bg-page-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* 同步状态卡片 */}
        <View className="mx-4 mt-4 p-4 rounded-xl bg-surface-primary">
          <View className="flex-row items-center gap-3">
            {isSyncing ? (
              <Animated.View style={spinStyle}>
                <Icon as={statusInfo.icon} size={24} color={statusInfo.color} />
              </Animated.View>
            ) : (
              <Icon as={statusInfo.icon} size={24} color={statusInfo.color} />
            )}
            <View className="flex-1">
              <Text className="text-base font-medium text-foreground">
                {statusInfo.text}
              </Text>
              {vaultName && (
                <Text className="text-sm text-muted-foreground mt-0.5">
                  {t('cloudSyncWorkspace', { name: vaultName })}
                </Text>
              )}
            </View>
          </View>
          {lastSyncAt && (
            <Text className="text-xs text-muted-foreground mt-3">
              {t('cloudSyncLastSync', { time: lastSyncText })}
            </Text>
          )}
        </View>

        {/* 同步设置 */}
        <SettingsGroup title={t('syncSection')}>
          <SettingsRow
            icon={CloudIcon}
            iconColor={colors.info}
            title={t('enableCloudSync')}
            subtitle={t('cloudSyncSubtitle')}
            showArrow={false}
            rightContent={
              <Switch
                value={syncEnabled}
                onValueChange={handleToggleSync}
                trackColor={{ false: colors.muted, true: colors.primary }}
              />
            }
          />
        </SettingsGroup>

        {/* 智能检索 */}
        <SettingsGroup
          title={t('smartIndex')}
          footer={t('smartIndexAIDescription')}
        >
          <SettingsRow
            icon={SparklesIcon}
            iconColor={colors.warning}
            title={t('enableSmartIndex')}
            showArrow={false}
            disabled={!syncEnabled}
            rightContent={
              <Switch
                value={vectorizeEnabled}
                onValueChange={handleToggleVectorize}
                disabled={!syncEnabled}
                trackColor={{ false: colors.muted, true: colors.primary }}
              />
            }
          />
          {usage && (
            <>
              <SettingsSeparator />
              <SettingsRow
                icon={SparklesIcon}
                iconColor={colors.warning}
                title={t('indexedFiles')}
                showArrow={false}
                rightContent={
                  <Text className="text-[15px] text-muted-foreground">
                    {usage.vectorized.count} / {usage.vectorized.limit}
                  </Text>
                }
              />
            </>
          )}
        </SettingsGroup>

        {/* 存储用量 */}
        {usage && (
          <SettingsGroup title={t('storageSpace')}>
            <SettingsRow
              icon={HardDriveIcon}
              iconColor={colors.info}
              title={t('usedSpace')}
              showArrow={false}
              rightContent={
                isLoadingUsage ? (
                  <ActivityIndicator size="small" color={colors.spinner} />
                ) : (
                  <Text className="text-[15px] text-muted-foreground">
                    {formatStorageSize(usage.storage.used)} / {formatStorageSize(usage.storage.limit)}
                  </Text>
                )
              }
            />
            <View className="px-4 pb-3">
              <View className="h-1.5 bg-muted rounded-sm overflow-hidden">
                <View
                  className="h-full bg-primary rounded-sm"
                  style={{ width: `${Math.min(usage.storage.percentage, 100)}%` }}
                />
              </View>
              <Text className="text-xs text-muted-foreground mt-1.5">
                {t('percentUsedPlan', { percent: usage.storage.percentage.toFixed(1), plan: usage.plan })}
              </Text>
            </View>
          </SettingsGroup>
        )}

        {/* 操作按钮 */}
        <View className="mx-4 mt-2">
          <Pressable
            onPress={handleManualSync}
            disabled={isSyncing || !syncEnabled}
            className="bg-primary rounded-xl py-3.5 items-center active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-primary-foreground font-semibold text-base">
              {isSyncing ? t('cloudSyncSyncing') : t('syncNow')}
            </Text>
          </Pressable>
        </View>

        {/* 设备信息 */}
        {settings && (
          <SettingsGroup title={t('deviceInfo')}>
            <View className="px-4 py-3">
              <Text className="text-[13px] text-muted-foreground">{t('deviceName')}</Text>
              <Text className="text-base text-foreground mt-1">
                {settings.deviceName}
              </Text>
            </View>
            <SettingsSeparator indent={16} />
            <View className="px-4 py-3">
              <Text className="text-[13px] text-muted-foreground">{t('deviceId')}</Text>
              <Text className="text-xs text-muted-foreground mt-1 font-mono">
                {settings.deviceId}
              </Text>
            </View>
          </SettingsGroup>
        )}
      </ScrollView>
    </View>
  )
}
