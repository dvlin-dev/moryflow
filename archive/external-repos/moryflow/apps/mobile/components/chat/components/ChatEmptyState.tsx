/**
 * 聊天空状态组件
 */

import { View, ActivityIndicator } from 'react-native'
import { useThemeColors } from '@/lib/theme'

interface ChatEmptyStateProps {
  isLoadingHistory: boolean
}

export function ChatEmptyState({ isLoadingHistory }: ChatEmptyStateProps) {
  const colors = useThemeColors()

  if (!isLoadingHistory) {
    return null
  }

  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="small" color={colors.spinner} />
    </View>
  )
}
