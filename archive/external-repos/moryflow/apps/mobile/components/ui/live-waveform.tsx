/**
 * [PROPS]: levels, isActive, barCount, color
 * [EMITS]: 无
 * [POS]: 实时音频波形组件，用于录音时显示音频电平
 */

import { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useThemeColors } from '@/lib/theme'

// ==================== 类型定义 ====================

export interface LiveWaveformProps {
  /** 归一化的音频电平数组 (0-1) */
  levels: number[]
  /** 是否正在录音 */
  isActive: boolean
  /** 条形数量，默认 20 */
  barCount?: number
  /** 条形宽度，默认 3 */
  barWidth?: number
  /** 条形间距，默认 2 */
  barGap?: number
  /** 最小高度，默认 4 */
  minHeight?: number
  /** 最大高度，默认 24 */
  maxHeight?: number
  /** 条形颜色，默认使用主题 foreground */
  color?: string
}

// ==================== 常量 ====================

const DEFAULT_BAR_COUNT = 20
const DEFAULT_BAR_WIDTH = 3
const DEFAULT_BAR_GAP = 2
const DEFAULT_MIN_HEIGHT = 4
const DEFAULT_MAX_HEIGHT = 24

// ==================== 子组件 ====================

interface WaveformBarProps {
  level: number
  isActive: boolean
  minHeight: number
  maxHeight: number
  barWidth: number
  color: string
}

function WaveformBar({
  level,
  isActive,
  minHeight,
  maxHeight,
  barWidth,
  color,
}: WaveformBarProps) {
  const height = useSharedValue(minHeight)

  useEffect(() => {
    if (isActive) {
      // 根据 level 计算目标高度
      const targetHeight = minHeight + level * (maxHeight - minHeight)
      height.value = withSpring(targetHeight, {
        damping: 15,
        stiffness: 150,
        mass: 0.5,
      })
    } else {
      // 非活跃时回到最小高度
      height.value = withTiming(minHeight, { duration: 200 })
    }
  }, [level, isActive, minHeight, maxHeight, height])

  // Animated.View: nativewind bug，必须使用纯 style
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    width: barWidth,
    backgroundColor: color,
    borderRadius: barWidth / 2,
  }))

  return <Animated.View style={animatedStyle} />
}

// ==================== 主组件 ====================

export function LiveWaveform({
  levels,
  isActive,
  barCount = DEFAULT_BAR_COUNT,
  barWidth = DEFAULT_BAR_WIDTH,
  barGap = DEFAULT_BAR_GAP,
  minHeight = DEFAULT_MIN_HEIGHT,
  maxHeight = DEFAULT_MAX_HEIGHT,
  color,
}: LiveWaveformProps) {
  const colors = useThemeColors()
  const barColor = color ?? colors.foreground

  // 将 levels 数组映射到 barCount 个条形
  const barLevels = useMemo(() => {
    const result: number[] = []

    if (levels.length === 0) {
      // 没有数据时全部为 0
      return Array(barCount).fill(0)
    }

    // 将 levels 均匀分布到 barCount 个条形
    for (let i = 0; i < barCount; i++) {
      // 从右向左填充，最新的数据在右边
      const levelIndex = levels.length - barCount + i
      if (levelIndex >= 0 && levelIndex < levels.length) {
        result.push(levels[levelIndex])
      } else {
        result.push(0)
      }
    }

    return result
  }, [levels, barCount])

  return (
    // gap 是动态 prop，需保留 style
    <View className="flex-row items-center justify-center" style={{ gap: barGap }}>
      {barLevels.map((level, index) => (
        <WaveformBar
          key={index}
          level={level}
          isActive={isActive}
          minHeight={minHeight}
          maxHeight={maxHeight}
          barWidth={barWidth}
          color={barColor}
        />
      ))}
    </View>
  )
}
