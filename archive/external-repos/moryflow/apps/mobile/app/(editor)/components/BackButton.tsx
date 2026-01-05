import { Pressable } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeftIcon } from 'lucide-react-native'
import { useThemeColors } from '@/lib/theme'
import { GlassButtonContainer } from './GlassButtonContainer'

interface BackButtonProps {
  /** 返回前的回调，可用于保存等操作 */
  onBeforeBack?: () => void | Promise<void>
}

/**
 * 返回按钮
 * 悬浮在左上角的玻璃效果返回按钮
 * 当无法返回时跳转到首页
 */
export function BackButton({ onBeforeBack }: BackButtonProps) {
  const colors = useThemeColors()

  const handleBack = () => {
    // 触发保存但不等待（异步保存，立即返回）
    if (onBeforeBack) {
      void onBeforeBack()
    }

    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)')
    }
  }

  return (
    <Pressable onPress={handleBack} testID="back-button">
      <GlassButtonContainer>
        <ChevronLeftIcon size={22} color={colors.textPrimary} strokeWidth={2.5} />
      </GlassButtonContainer>
    </Pressable>
  )
}
