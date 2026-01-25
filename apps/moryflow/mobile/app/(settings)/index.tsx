/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: 设置主页，iOS 原生风格
 */

import { View, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PaletteIcon, KeyIcon, LogOutIcon, Trash2Icon, CloudIcon } from '@/components/ui/icons';
import * as React from 'react';

import { Text } from '@/components/ui/text';
import { useAuth, useUser } from '@/lib/contexts/auth.context';
import { useAuthGuard } from '@/lib/contexts/auth-guard.context';
import { useThemeColors } from '@/lib/theme';
import { useTranslation } from '@/lib/i18n';
import { MembershipCard, UpgradeSheet } from '@/components/membership';
import {
  SettingsGroup,
  SettingsRow,
  SettingsSeparator,
  LanguageSelector,
} from '@/components/settings';

export default function SettingsScreen() {
  const { user, isSignedIn } = useUser();
  const { signOut } = useAuth();
  const { requireAuth } = useAuthGuard();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [showUpgradeSheet, setShowUpgradeSheet] = React.useState(false);
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t } = useTranslation('settings');
  const { t: tAuth } = useTranslation('auth');
  const { t: tUser } = useTranslation('user');
  const { t: tCommon } = useTranslation('common');

  const handleAppearance = () => router.push('/(settings)/appearance');
  const handleCloudSync = () => router.push('/(settings)/cloud-sync');

  const handleChangePassword = () => {
    requireAuth('access_settings', () => {
      router.push('/(settings)/change-password');
    });
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = () => router.push('/(settings)/delete-account');

  return (
    <View className="bg-page-background flex-1">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* 会员卡 */}
        <View className="py-4">
          <MembershipCard onUpgradePress={() => setShowUpgradeSheet(true)} />
        </View>

        {/* 用户信息 */}
        {isSignedIn && (
          <View className="mb-2 px-5 py-2">
            <Text className="text-foreground text-xl font-semibold">
              {user?.name || tUser('defaultUsername')}
            </Text>
            <Text className="text-muted-foreground mt-1 text-[15px]">
              {user?.email || tUser('noEmail')}
            </Text>
          </View>
        )}

        {/* 通用设置 */}
        <SettingsGroup title={tCommon('general') || 'GENERAL'}>
          <LanguageSelector />
          <SettingsSeparator />
          <SettingsRow
            icon={PaletteIcon}
            iconColor={colors.primary}
            title={t('appearance')}
            onPress={handleAppearance}
          />
          <SettingsSeparator />
          <SettingsRow
            icon={CloudIcon}
            iconColor={colors.info}
            title={t('cloudSync')}
            onPress={handleCloudSync}
          />
          {isSignedIn && (
            <>
              <SettingsSeparator />
              <SettingsRow
                icon={KeyIcon}
                iconColor={colors.warning}
                title={t('changePassword')}
                onPress={handleChangePassword}
              />
            </>
          )}
        </SettingsGroup>

        {/* 危险操作 */}
        {isSignedIn && (
          <SettingsGroup>
            <SettingsRow
              icon={LogOutIcon}
              title={tAuth('signOut')}
              onPress={handleSignOut}
              variant="destructive"
              showArrow={false}
              disabled={isSigningOut}
              rightContent={
                isSigningOut ? (
                  <ActivityIndicator size="small" color={colors.destructive} />
                ) : undefined
              }
            />
          </SettingsGroup>
        )}

        {isSignedIn && (
          <SettingsGroup>
            <SettingsRow
              icon={Trash2Icon}
              title={t('deleteAccount')}
              onPress={handleDeleteAccount}
              variant="destructive"
            />
          </SettingsGroup>
        )}
      </ScrollView>

      <Modal
        visible={showUpgradeSheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUpgradeSheet(false)}>
        <UpgradeSheet onClose={() => setShowUpgradeSheet(false)} />
      </Modal>
    </View>
  );
}
