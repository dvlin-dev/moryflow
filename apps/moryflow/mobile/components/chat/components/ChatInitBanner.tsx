/**
 * 聊天初始化状态提示
 */

import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/lib/i18n';
import { useThemeColors } from '@/lib/theme';

interface ChatInitBannerProps {
  isInitialized: boolean;
  isSessionsReady: boolean;
}

export function ChatInitBanner({ isInitialized, isSessionsReady }: ChatInitBannerProps) {
  const colors = useThemeColors();
  const { t } = useTranslation('chat');

  if (isInitialized && isSessionsReady) {
    return null;
  }

  return (
    <View className="bg-muted/50 items-center justify-center py-4">
      <View className="flex-row items-center">
        <ActivityIndicator size="small" color={colors.spinner} />
        <Text className="text-muted-foreground ml-2">{t('chatInitializing')}</Text>
      </View>
    </View>
  );
}
