import { ForgotPasswordForm } from '@/components/auth';
import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useTranslation } from '@/lib/i18n';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');

  return (
    <>
      <Stack.Screen
        options={{
          title: t('forgotPasswordTitle'),
          headerTransparent: true,
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="sm:flex-1 items-center justify-center p-4 py-8 sm:py-4 sm:p-6 mt-safe"
        keyboardDismissMode="interactive"
      >
        <View className="w-full max-w-sm">
          <ForgotPasswordForm />
        </View>
      </ScrollView>
    </>
  );
}
