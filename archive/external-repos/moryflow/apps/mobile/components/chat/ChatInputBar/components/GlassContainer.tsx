/**
 * [PROPS]: children
 * [EMITS]: -
 * [POS]: 玻璃效果容器，iOS 26+ 使用液态玻璃，否则使用 BlurView
 */

import { useMemo } from 'react'
import { View, Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { useTheme } from '@/lib/hooks/use-theme'
import { useThemeColors } from '@/lib/theme'

interface GlassContainerProps {
  children: React.ReactNode
}

export function GlassContainer({ children }: GlassContainerProps) {
  const { colorScheme } = useTheme()
  const colors = useThemeColors()
  const isDark = colorScheme === 'dark'

  // 检测液态玻璃是否可用
  const glassAvailable = useMemo(() => {
    try {
      return Platform.OS === 'ios' && isLiquidGlassAvailable()
    } catch {
      return false
    }
  }, [])

  // 液态玻璃效果
  if (glassAvailable) {
    return (
      <View
        style={{
          borderRadius: 24,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.glassBorder,
        }}
      >
        <GlassView
          style={{ borderRadius: 24 }}
          glassEffectStyle="regular"
          isInteractive={false}
          tintColor={isDark ? 'rgba(20, 20, 22, 0.7)' : undefined}
        >
          {children}
        </GlassView>
      </View>
    )
  }

  // Fallback: BlurView
  const overlayColor = isDark
    ? 'rgba(20, 20, 22, 0.92)'
    : 'rgba(255, 255, 255, 0.9)'

  return (
    <View
      style={{
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.glassBorder,
      }}
    >
      <BlurView
        intensity={isDark ? 60 : 80}
        tint={isDark ? 'dark' : 'light'}
        style={{ borderRadius: 24, overflow: 'hidden' }}
      >
        <View style={{ borderRadius: 24, backgroundColor: overlayColor }}>
          {children}
        </View>
      </BlurView>
    </View>
  )
}
