/**
 * 聊天初始化状态提示
 */

import { View, ActivityIndicator } from 'react-native'
import { Text } from '@/components/ui/text'
import { useThemeColors } from '@/lib/theme'

interface ChatInitBannerProps {
  isInitialized: boolean
  isSessionsReady: boolean
}

export function ChatInitBanner({ isInitialized, isSessionsReady }: ChatInitBannerProps) {
  const colors = useThemeColors()

  if (isInitialized && isSessionsReady) {
    return null
  }

  return (
    <View className="items-center justify-center py-4 bg-muted/50">
      <View className="flex-row items-center">
        <ActivityIndicator size="small" color={colors.spinner} />
        <Text className="ml-2 text-muted-foreground">正在初始化...</Text>
      </View>
    </View>
  )
}
