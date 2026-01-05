/**
 * [PROPS]: { size, icon, onPress, disabled, className } - 玻璃按钮配置
 * [EMITS]: onPress - 点击事件
 * [POS]: 通用玻璃效果按钮，iOS 26+ 使用 LiquidGlass，其他使用 BlurView 降级
 */

import { Pressable, View, Platform, type ViewStyle } from 'react-native'
import { useMemo } from 'react'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { BlurView } from 'expo-blur'
import { useTheme } from '@/lib/hooks/use-theme'
import { useThemeColors } from '@/lib/theme'
import { cn } from '@/lib/utils'

type GlassButtonSize = 'sm' | 'md' | 'lg'

interface GlassButtonProps {
  /** 按钮尺寸 */
  size?: GlassButtonSize
  /** 图标内容 */
  icon: React.ReactNode
  /** 点击事件 */
  onPress?: () => void
  /** 是否禁用 */
  disabled?: boolean
  /** 额外样式类名 */
  className?: string
  /** 玻璃色调（仅 iOS 26+ 生效） */
  tintColor?: string
}

// 尺寸映射
const SIZE_MAP: Record<GlassButtonSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
}

/**
 * 玻璃效果按钮
 * - iOS 26+ 使用 LiquidGlass 效果
 * - 其他系统使用 BlurView 降级
 */
export function GlassButton({
  size = 'md',
  icon,
  onPress,
  disabled = false,
  className,
  tintColor,
}: GlassButtonProps) {
  const { colorScheme } = useTheme()
  const colors = useThemeColors()
  const isDark = colorScheme === 'dark'
  const buttonSize = SIZE_MAP[size]

  const glassAvailable = useMemo(() => {
    try {
      return Platform.OS === 'ios' && isLiquidGlassAvailable()
    } catch {
      return false
    }
  }, [])

  const buttonStyle: ViewStyle = {
    width: buttonSize,
    height: buttonSize,
    borderRadius: buttonSize / 2,
    overflow: 'hidden',
    opacity: disabled ? 0.5 : 1,
  }

  const iconContainer = (
    <View className="flex-1 items-center justify-center">{icon}</View>
  )

  const glassContent = glassAvailable ? (
    <GlassView
      style={buttonStyle}
      glassEffectStyle="regular"
      tintColor={tintColor}
      isInteractive={!disabled}
    >
      {iconContainer}
    </GlassView>
  ) : (
    <BlurView
      intensity={isDark ? 40 : 60}
      tint={isDark ? 'dark' : 'light'}
      style={buttonStyle}
    >
      <View
        style={{
          flex: 1,
          borderRadius: buttonSize / 2,
          backgroundColor: colors.glassBackground,
        }}
      >
        {iconContainer}
      </View>
    </BlurView>
  )

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn('active:opacity-80', className)}
      style={{ width: buttonSize, height: buttonSize }}
    >
      {glassContent}
    </Pressable>
  )
}
