import React, { useEffect, useRef, useCallback } from 'react'
import { Animated, View } from 'react-native'
import { Text } from './text'
import { cn } from '@/lib/utils'

interface ToastProps {
  message: string
  visible: boolean
  duration?: number
  onHide?: () => void
  variant?: 'default' | 'success' | 'error'
}

export function Toast({
  message,
  visible,
  duration = 2000,
  onHide,
  variant = 'default'
}: ToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const animationRef = useRef<Animated.CompositeAnimation | null>(null)

  const handleHide = useCallback(() => {
    // 使用 setTimeout 来避免在渲染期间更新状态
    setTimeout(() => {
      onHide?.()
    }, 0)
  }, [onHide])

  useEffect(() => {
    if (visible) {
      // 清除之前的动画
      if (animationRef.current) {
        animationRef.current.stop()
      }

      animationRef.current = Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ])

      animationRef.current.start(handleHide)
    } else {
      // 如果visible为false，立即隐藏
      fadeAnim.setValue(0)
      if (animationRef.current) {
        animationRef.current.stop()
      }
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop()
      }
    }
  }, [visible, fadeAnim, duration, handleHide])

  if (!visible) return null

  return (
    <Animated.View
      className="absolute bottom-[100px] left-0 right-0 items-center z-[1000]"
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      }}
      pointerEvents="none"
    >
      <View
        className={cn(
          "px-4 py-2 rounded-lg shadow-sm",
          variant === 'success' && "bg-foreground/90",
          variant === 'error' && "bg-destructive/90",
          variant === 'default' && "bg-muted/90"
        )}
      >
        <Text
          className={cn(
            "text-sm",
            variant === 'success' && "text-background",
            variant === 'error' && "text-destructive-foreground",
            variant === 'default' && "text-foreground"
          )}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  )
}