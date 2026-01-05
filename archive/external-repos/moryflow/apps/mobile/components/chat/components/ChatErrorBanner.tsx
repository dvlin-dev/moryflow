/**
 * 聊天错误提示组件
 */

import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import { useTheme } from '@/lib/hooks/use-theme'

interface ChatErrorBannerProps {
  error: Error
}

export function ChatErrorBanner({ error }: ChatErrorBannerProps) {
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'

  return (
    <View style={{ paddingHorizontal: 12, alignItems: 'center' }}>
      <View
        style={{
          backgroundColor: isDark ? 'rgba(255, 99, 99, 0.15)' : 'rgba(220, 53, 69, 0.08)',
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          maxWidth: '85%',
        }}
      >
        <Text
          style={{
            color: isDark ? 'rgba(255, 150, 150, 0.9)' : 'rgba(180, 50, 60, 0.85)',
            fontSize: 13,
            textAlign: 'center',
            lineHeight: 18,
          }}
        >
          {error.message || String(error)}
        </Text>
      </View>
    </View>
  )
}
