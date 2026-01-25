import { Stack, router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ChevronLeftIcon } from '@/components/ui/icons';
import * as React from 'react';
import { useTranslation } from '@/lib/i18n';
import { ChangePasswordProvider, useChangePassword } from '@/lib/contexts/change-password.context';
import { ActivityIndicator, View } from 'react-native';
import { useThemeColors } from '@/lib/theme';

function HeaderSaveButton() {
  const { canSave, isLoading, onSave } = useChangePassword();
  const { t } = useTranslation('common');
  const theme = useThemeColors();

  return (
    <Button variant="ghost" size="sm" onPress={onSave} disabled={!canSave || isLoading}>
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <Text className={canSave ? 'text-primary' : 'text-muted-foreground'}>{t('save')}</Text>
      )}
    </Button>
  );
}

function StackScreens() {
  const { t: tSettings } = useTranslation('settings');
  const colors = useThemeColors();

  // uniwind: @variant 语法自动处理 Modal 视图层的主题，无需手动注入 CSS 变量
  return (
    <View className="bg-background flex-1">
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackTitle: '',
          headerStyle: {
            backgroundColor: colors.background,
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.foreground,
          // 子页面显示返回按钮
          headerLeft: () => (
            <Button variant="ghost" size="icon" onPress={() => router.back()}>
              <Icon as={ChevronLeftIcon} className="size-6" />
            </Button>
          ),
        }}>
        <Stack.Screen
          name="index"
          options={{
            title: tSettings('settings'),
            // 设置首页不显示返回按钮，用户可以下拉关闭抽屉
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: tSettings('profile'),
          }}
        />
        <Stack.Screen
          name="appearance"
          options={{
            title: tSettings('appearance'),
          }}
        />
        <Stack.Screen
          name="change-password"
          options={{
            title: tSettings('changePassword'),
            headerRight: () => <HeaderSaveButton />,
          }}
        />
        <Stack.Screen
          name="delete-account"
          options={{
            title: tSettings('deleteAccount'),
          }}
        />
        <Stack.Screen
          name="cloud-sync"
          options={{
            title: '云同步',
          }}
        />
      </Stack>
    </View>
  );
}

export default function SettingsLayout() {
  return (
    <ChangePasswordProvider>
      <StackScreens />
    </ChangePasswordProvider>
  );
}
