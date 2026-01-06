import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/lib/i18n';

export default function NotFoundScreen() {
  const { t } = useTranslation('common');

  return (
    <>
      <Stack.Screen options={{ title: t('oops') }} />
      <View>
        <Text>{t('pageNotFound')}</Text>

        <Link href="/">
          <Text>{t('goToHome')}</Text>
        </Link>
      </View>
    </>
  );
}
