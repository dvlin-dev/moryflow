import { View, Platform, type ViewStyle } from 'react-native'
import { useMemo } from 'react'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { BlurView } from 'expo-blur'
import { useTheme } from '@/lib/hooks/use-theme'

interface GlassButtonContainerProps {
  children: React.ReactNode
  /** 按钮尺寸，默认 40 */
  size?: number
  /** 玻璃色调（仅 iOS 26+ 生效） */
  tintColor?: string
  /** 降级背景色（BlurView fallback 时使用） */
  fallbackColor?: string
}

/**
 * 玻璃效果按钮容器
 * iOS 26+ 使用 LiquidGlass，其他情况使用 BlurView 降级
 */
export function GlassButtonContainer({
  children,
  size = 40,
  tintColor,
  fallbackColor,
}: GlassButtonContainerProps) {
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'

  const glassAvailable = useMemo(() => {
    try {
      return Platform.OS === 'ios' && isLiquidGlassAvailable()
    } catch {
      return false
    }
  }, [])

  const buttonStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
  }

  const content = (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  )

  // 默认降级背景色
  const defaultFallbackColor = isDark ? 'rgba(60, 60, 67, 0.6)' : 'rgba(255, 255, 255, 0.7)'

  if (glassAvailable) {
    return (
      <GlassView
        style={buttonStyle}
        glassEffectStyle="regular"
        tintColor={tintColor}
        isInteractive
      >
        {content}
      </GlassView>
    )
  }

  return (
    <BlurView
      intensity={isDark ? 40 : 60}
      tint={isDark ? 'dark' : 'light'}
      style={buttonStyle}
    >
      <View
        style={{
          flex: 1,
          borderRadius: size / 2,
          backgroundColor: fallbackColor ?? defaultFallbackColor,
        }}
      >
        {content}
      </View>
    </BlurView>
  )
}
