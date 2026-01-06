import { SignUpForm } from '@/components/auth';
import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useTranslation } from '@/lib/i18n';

export default function SignUpScreen() {
  const { t } = useTranslation('auth');

  return (
    <>
      <Stack.Screen
        options={{
          title: t('signUpTitle'),
          presentation: 'modal',
          headerTransparent: true,
          gestureEnabled: false,
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="sm:flex-1 items-center justify-center p-4 py-8 sm:py-4 sm:p-6 mt-safe"
        keyboardDismissMode="interactive"
      >
        <View className="w-full max-w-sm">
          <SignUpForm />
        </View>
      </ScrollView>
    </>
  );
}