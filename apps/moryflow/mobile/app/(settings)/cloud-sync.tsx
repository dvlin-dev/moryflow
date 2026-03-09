/**
 * [PROPS]: 无
 * [EMITS]: 无
 * [POS]: 云同步设置页面，iOS 原生风格
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { View, ScrollView, ActivityIndicator, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useThemeColors } from '@/lib/theme';
import {
  useCloudSync,
  cloudSyncApi,
  formatStorageSize,
  formatLastSyncTime,
} from '@/lib/cloud-sync';
import { resolveMobileSyncStatusModel } from '@/lib/cloud-sync/status-presentation';
import { useUser } from '@/lib/contexts/auth.context';
import { useAuthGuard } from '@/lib/contexts/auth-guard.context';
import { useTranslation } from '@moryflow/i18n';
import {
  CloudIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HardDriveIcon,
  SettingsIcon,
} from '@/components/ui/icons';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UsageResponse } from '@moryflow/api/cloud-sync';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  useSharedValue,
} from 'react-native-reanimated';
import { SettingsGroup, SettingsRow, SettingsSeparator } from '@/components/settings';

export default function CloudSyncSettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { requireAuth } = useAuthGuard();
  const { t } = useTranslation('settings');

  const {
    status,
    vaultId,
    isSyncing,
    isEnabled,
    hasError,
    lastSyncAt,
    notice,
    settings,
    updateSettings,
    triggerSync,
  } = useCloudSync();

  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const syncEnabled = settings?.syncEnabled ?? false;
  // 旋转动画
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isSyncing) {
      rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1, false);
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [isSyncing, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // 加载用量数据
  const loadUsage = useCallback(async () => {
    if (!isSignedIn || !isEnabled) return;
    setIsLoadingUsage(true);
    try {
      const data = await cloudSyncApi.getUsage();
      setUsage(data);
    } catch (err) {
      console.error('[CloudSync] Failed to load usage:', err);
    } finally {
      setIsLoadingUsage(false);
    }
  }, [isSignedIn, isEnabled]);

  useEffect(() => {
    if (!showAdvanced) return;
    loadUsage();
  }, [showAdvanced, loadUsage]);

  const lastSyncText = useMemo(
    () => (lastSyncAt ? formatLastSyncTime(lastSyncAt) : ''),
    [lastSyncAt]
  );
  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return t('cloudSyncNeverSynced');
    const label = lastSyncText || t('cloudSyncNeverSynced');
    return t('cloudSyncLastSync', { time: label });
  }, [lastSyncAt, lastSyncText, t]);

  const statusModel = useMemo(
    () =>
      resolveMobileSyncStatusModel({
        hasBinding: Boolean(vaultId),
        isEnabled,
        isSyncing,
        status,
        hasError,
        notice,
      }),
    [hasError, isEnabled, isSyncing, notice, status, vaultId]
  );
  const firstConflictItem = notice?.items[0] ?? null;
  const statusInfo = useMemo(() => {
    if (statusModel.tone === 'syncing') {
      return { text: t('cloudSyncSyncing'), icon: RefreshCwIcon, color: colors.primary };
    }
    if (statusModel.tone === 'needs-attention') {
      return {
        text: t('cloudSyncNeedsAttention'),
        icon: AlertCircleIcon,
        color: colors.warning,
      };
    }
    return {
      text: t('cloudSyncSynced'),
      icon: CheckCircleIcon,
      color: colors.success,
    };
  }, [colors, statusModel.tone, t]);
  const callout = useMemo(() => {
    if (statusModel.calloutKind === 'recovery') {
      return {
        title: t('cloudSyncNeedsAttention'),
        description: t('cloudSyncRecoveryDescription'),
        actionLabel: t('cloudSyncResumeRecovery'),
        toneColor: colors.warning,
      };
    }
    if (statusModel.calloutKind === 'offline') {
      return {
        title: t('cloudSyncOffline'),
        description: t('cloudSyncOfflineDescription'),
        actionLabel: t('cloudSyncTryAgain'),
        toneColor: colors.warning,
      };
    }
    if (statusModel.calloutKind === 'setup') {
      return {
        title: t('cloudSyncNeedsAttention'),
        description: t('cloudSyncSetupDescription'),
        toneColor: colors.warning,
      };
    }
    if (statusModel.calloutKind === 'conflict') {
      return {
        title: t('cloudSyncConflictCopyReady'),
        description: t('cloudSyncConflictCopyDescription'),
        actionLabel:
          notice && notice.items.length > 1
            ? t('cloudSyncOpenFirstConflictCopy')
            : t('cloudSyncOpenConflictCopy'),
        detail: firstConflictItem?.path,
        toneColor: colors.info,
      };
    }
    return null;
  }, [colors.info, colors.warning, firstConflictItem?.path, notice, statusModel.calloutKind, t]);

  const handlePrimaryAction = useCallback(() => {
    if (statusModel.primaryAction === 'open-conflict-copy' && firstConflictItem) {
      router.push({
        pathname: '/(editor)/[fileId]',
        params: { fileId: firstConflictItem.fileId },
      });
      return;
    }

    if (statusModel.primaryAction === 'open-settings') {
      return;
    }

    triggerSync();
  }, [firstConflictItem, router, statusModel.primaryAction, triggerSync]);

  const handleToggleSync = useCallback(
    async (value: boolean) => {
      if (value && !isSignedIn) {
        requireAuth('enable_cloud_sync', () => {
          updateSettings({ syncEnabled: true });
        });
        return;
      }
      await updateSettings({ syncEnabled: value });
    },
    [isSignedIn, requireAuth, updateSettings]
  );

  return (
    <View className="bg-page-background flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* 同步状态卡片 */}
        <View className="bg-surface-primary mx-4 mt-4 rounded-xl p-4">
          <View className="flex-row items-center gap-3">
            {isSyncing ? (
              <Animated.View style={spinStyle}>
                <Icon as={statusInfo.icon} size={24} color={statusInfo.color} />
              </Animated.View>
            ) : (
              <Icon as={statusInfo.icon} size={24} color={statusInfo.color} />
            )}
            <View className="flex-1">
              <Text className="text-foreground text-base font-medium">{statusInfo.text}</Text>
              <Text className="text-muted-foreground mt-1 text-xs">{lastSyncLabel}</Text>
            </View>
          </View>

          {callout ? (
            <View
              className="mt-4 rounded-lg px-3 py-3"
              style={{
                backgroundColor: `${callout.toneColor}14`,
                borderWidth: 1,
                borderColor: `${callout.toneColor}33`,
              }}>
              <Text className="text-foreground text-sm font-medium">{callout.title}</Text>
              <Text className="text-muted-foreground mt-1 text-xs">{callout.description}</Text>
              {callout.detail ? (
                <Text className="text-muted-foreground mt-1 text-xs">{callout.detail}</Text>
              ) : null}
              {callout.actionLabel ? (
                <Button
                  className="mt-3 self-start"
                  variant={statusModel.calloutKind === 'conflict' ? 'secondary' : 'default'}
                  size="sm"
                  onPress={handlePrimaryAction}>
                  <Text>{callout.actionLabel}</Text>
                </Button>
              ) : null}
            </View>
          ) : null}
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

        {/* Advanced */}
        <SettingsGroup>
          <SettingsRow
            icon={SettingsIcon}
            iconColor={colors.iconMuted}
            title={t('advanced')}
            onPress={() => setShowAdvanced((prev) => !prev)}
            showArrow={false}
            rightContent={
              <Icon
                as={showAdvanced ? ChevronUpIcon : ChevronDownIcon}
                size={18}
                color={colors.iconMuted}
              />
            }
          />
        </SettingsGroup>

        {showAdvanced && (
          <>
            {/* 存储用量 */}
            {(usage || isLoadingUsage) && (
              <SettingsGroup title={t('storageSpace')}>
                <SettingsRow
                  icon={HardDriveIcon}
                  iconColor={colors.info}
                  title={t('usedSpace')}
                  showArrow={false}
                  rightContent={
                    isLoadingUsage ? (
                      <ActivityIndicator size="small" color={colors.spinner} />
                    ) : usage ? (
                      <Text className="text-muted-foreground text-[15px]">
                        {formatStorageSize(usage.storage.used)} /{' '}
                        {formatStorageSize(usage.storage.limit)}
                      </Text>
                    ) : null
                  }
                />
                {usage && (
                  <View className="px-4 pb-3">
                    <View className="bg-muted h-1.5 overflow-hidden rounded-sm">
                      <View
                        className="bg-primary h-full rounded-sm"
                        style={{ width: `${Math.min(usage.storage.percentage, 100)}%` }}
                      />
                    </View>
                    <Text className="text-muted-foreground mt-1.5 text-xs">
                      {t('percentUsedPlan', {
                        percent: usage.storage.percentage.toFixed(1),
                        plan: usage.plan,
                      })}
                    </Text>
                  </View>
                )}
              </SettingsGroup>
            )}

            {/* 设备信息 */}
            {settings && (
              <SettingsGroup title={t('deviceInfo')}>
                <View className="px-4 py-3">
                  <Text className="text-muted-foreground text-[13px]">{t('deviceName')}</Text>
                  <Text className="text-foreground mt-1 text-base">{settings.deviceName}</Text>
                </View>
                <SettingsSeparator indent={16} />
                <View className="px-4 py-3">
                  <Text className="text-muted-foreground text-[13px]">{t('deviceId')}</Text>
                  <Text className="text-muted-foreground mt-1 font-mono text-xs">
                    {settings.deviceId}
                  </Text>
                </View>
              </SettingsGroup>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
