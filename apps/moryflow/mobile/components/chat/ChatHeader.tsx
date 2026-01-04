import React, { useMemo } from 'react'
import { View, Pressable, Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/lib/hooks/use-theme'
import { useThemeColors } from '@/lib/theme'
import { Text } from '@/components/ui/text'
import { ClockIcon, PlusIcon } from 'lucide-react-native'

interface ChatHeaderProps {
  title: string
  onTitlePress?: () => void
  onNewConversation?: () => void
  onHistoryPress?: () => void
  /** 是否在 Sheet 中使用（不需要顶部安全区域） */
  isInSheet?: boolean
}

export function ChatHeader({
  title,
  onTitlePress,
  onNewConversation,
  onHistoryPress,
  isInSheet = false,
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets()
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

  // 渲染液态玻璃按钮
  const renderGlassButton = (icon: React.ReactNode, onPress: (() => void) | undefined) => {
    if (glassAvailable) {
      return (
        <Pressable onPress={onPress}>
          {/* GlassView: 库 API 限制，需保留 style */}
          <GlassView
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
            glassEffectStyle="regular"
            isInteractive={true}
          >
            {icon}
          </GlassView>
        </Pressable>
      )
    }

    // Fallback: 普通按钮
    return (
      <Pressable onPress={onPress}>
        <View
          className={`w-10 h-10 rounded-full items-center justify-center ${
            isDark ? 'bg-muted-foreground/35' : 'bg-muted-foreground/20'
          }`}
        >
          {icon}
        </View>
      </Pressable>
    )
  }

  // Header 内容
  const headerContent = (
    <View className="flex-row items-center justify-between h-11">
      {/* 左侧：历史对话按钮 */}
      {renderGlassButton(<ClockIcon size={18} color={colors.textPrimary} />, onHistoryPress)}

      {/* 中间：对话标题 */}
      <Pressable className="flex-1 items-center mx-3" onPress={onTitlePress}>
        <Text className="text-[17px] font-semibold text-foreground" numberOfLines={1}>
          {title}
        </Text>
      </Pressable>

      {/* 右侧：新建对话按钮 */}
      {renderGlassButton(<PlusIcon size={18} color={colors.textPrimary} />, onNewConversation)}
    </View>
  )

  // Header 容器（带模糊效果）
  // Sheet 模式下紧贴顶部（拖动条在 Sheet 容器外部）
  const paddingTop = isInSheet ? 0 : insets.top + 8

  return (
    <View
      className="absolute top-0 left-0 right-0 z-[100]"
      style={{ paddingTop }} // 动态 paddingTop：依赖 insets，需保留 style
    >
      {/* BlurView: 库 API 限制，需保留 style */}
      <BlurView
        intensity={isDark ? 50 : 70}
        tint={isDark ? 'dark' : 'light'}
        style={{ overflow: 'hidden' }}
      >
        <View className="px-4 py-3">{headerContent}</View>
      </BlurView>
    </View>
  )
}
