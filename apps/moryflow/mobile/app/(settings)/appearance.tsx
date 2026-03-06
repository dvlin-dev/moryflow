/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: 外观设置页，iOS 原生风格
 */

import { View, ActivityIndicator } from 'react-native';
import { CheckIcon, SunIcon, MoonIcon, MonitorIcon } from '@/components/ui/icons';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { useTheme, type Theme } from '@/lib/hooks/use-theme';
import { useThemeColors } from '@/lib/theme';
import { useTranslation } from '@moryflow/i18n';
import { SettingsGroup, SettingsRow, SettingsSeparator } from '@/components/settings';

export default function AppearanceScreen() {
  const { theme, setTheme, isLoading } = useTheme();
  const colors = useThemeColors();
  const { t } = useTranslation('common');

  const handleThemeChange = React.useCallback(
    (newTheme: Theme) => {
      setTheme(newTheme);
    },
    [setTheme]
  );

  // 选中标记
  const renderCheckmark = (isSelected: boolean) =>
    isSelected ? <Icon as={CheckIcon} size={20} color={colors.primary} /> : undefined;

  if (isLoading) {
    return (
      <View className="bg-page-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="bg-page-background flex-1">
      <View className="pt-6">
        <SettingsGroup title={t('selectThemeMode')}>
          <SettingsRow
            icon={MonitorIcon}
            iconColor={colors.iconMuted}
            title={t('systemMode')}
            onPress={() => handleThemeChange('system')}
            showArrow={false}
            rightContent={renderCheckmark(theme === 'system')}
          />
          <SettingsSeparator />
          <SettingsRow
            icon={SunIcon}
            iconColor={colors.warning}
            title={t('lightMode')}
            onPress={() => handleThemeChange('light')}
            showArrow={false}
            rightContent={renderCheckmark(theme === 'light')}
          />
          <SettingsSeparator />
          <SettingsRow
            icon={MoonIcon}
            iconColor={colors.info}
            title={t('darkMode')}
            onPress={() => handleThemeChange('dark')}
            showArrow={false}
            rightContent={renderCheckmark(theme === 'dark')}
          />
        </SettingsGroup>
      </View>
    </View>
  );
}
