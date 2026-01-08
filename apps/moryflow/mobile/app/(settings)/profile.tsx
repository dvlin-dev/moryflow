import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { UserAvatar } from '@/components/user';
import { useMembershipUser } from '@/lib/server';
import { USERNAME_CONFIG } from '@/lib/constants/validation';
import { router } from 'expo-router';
import { MailIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useTranslation } from '@/lib/i18n';
import { Icon } from '@/components/ui/icon';

/** 验证用户名格式 */
function isValidUsername(username: string): boolean {
  return USERNAME_CONFIG.PATTERN.test(username);
}

export default function ProfileScreen() {
  const { t } = useTranslation('user');
  const { t: tCommon } = useTranslation('common');
  const { t: tValidation } = useTranslation('validation');
  const { t: tSettings } = useTranslation('settings');
  const { user, isLoading } = useMembershipUser();

  const [username, setUsername] = React.useState(user?.name || '');

  // 更新本地状态当 user 改变时
  React.useEffect(() => {
    setUsername(user?.name || '');
  }, [user?.name]);

  const handleSave = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      Alert.alert(tCommon('error'), tValidation('required'));
      return;
    }

    if (trimmedUsername.length < USERNAME_CONFIG.MIN_LENGTH) {
      Alert.alert(
        tCommon('error'),
        tValidation('usernameMinLengthError', {
          min: USERNAME_CONFIG.MIN_LENGTH,
          current: trimmedUsername.length,
        })
      );
      return;
    }

    if (!isValidUsername(trimmedUsername)) {
      Alert.alert(tCommon('error'), tValidation('pattern'));
      return;
    }

    // TODO: 调用 membership API 更新用户名
    Alert.alert(tCommon('info'), '功能开发中', [
      { text: tCommon('confirm'), onPress: () => router.back() },
    ]);
  };

  const hasChanges = username !== (user?.name || '');
  const isUsernameValid =
    username.trim().length >= USERNAME_CONFIG.MIN_LENGTH && isValidUsername(username.trim());
  const canSave = hasChanges && isUsernameValid && !isLoading;

  return (
    <View className="bg-page-background flex-1">
      <ScrollView className="flex-1">
        {/* Avatar Section */}
        <View className="items-center py-8">
          <UserAvatar size="size-24" />
        </View>

        {/* Form Section */}
        <View className="space-y-6 px-4">
          <View>
            <Text className="mb-2 text-sm font-medium">{t('username')}</Text>
            <Input
              placeholder={t('usernameInputPlaceholder', {
                min: USERNAME_CONFIG.MIN_LENGTH,
                max: USERNAME_CONFIG.MAX_LENGTH,
              })}
              value={username}
              onChangeText={setUsername}
              editable={!isLoading}
              maxLength={USERNAME_CONFIG.MAX_LENGTH}
            />
            {username && username.length > 0 && username.length < USERNAME_CONFIG.MIN_LENGTH && (
              <Text className="text-destructive mt-1 text-xs">
                {t('usernameMinLengthError', {
                  min: USERNAME_CONFIG.MIN_LENGTH,
                  current: username.length,
                })}
              </Text>
            )}
            <Text className="text-muted-foreground mt-1 text-xs">{t('usernameFormatHint')}</Text>
          </View>

          <View>
            <Text className="mb-2 text-sm font-medium">{tValidation('email')}</Text>
            <View className="relative">
              <Input value={user?.email || ''} editable={false} className="pr-10 opacity-60" />
              <View className="absolute top-0 right-3 bottom-0 justify-center">
                <Icon as={MailIcon} className="text-muted-foreground size-5" />
              </View>
            </View>
            <Text className="text-muted-foreground mt-1 text-xs">{t('emailNotEditable')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View className="border-border border-t p-4">
        <Button size="lg" onPress={handleSave} disabled={!canSave} className="w-full">
          <Text>{tSettings('saveChanges')}</Text>
        </Button>
      </View>
    </View>
  );
}
