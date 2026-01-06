/**
 * 键盘高度监听 Hook
 */

import { useEffect, useRef, useState } from 'react'
import { Keyboard, Platform, Animated } from 'react-native'

interface UseKeyboardHeightOptions {
  /** iOS 动画时长 */
  iosDuration?: number
}

interface UseKeyboardHeightResult {
  /** 键盘高度 */
  keyboardHeight: number
  /** 动画值（用于 Animated.View） */
  animatedHeight: Animated.Value
}

/**
 * 监听键盘高度变化
 */
export function useKeyboardHeight(
  options: UseKeyboardHeightOptions = {}
): UseKeyboardHeightResult {
  const { iosDuration = 250 } = options
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const animatedHeight = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const onKeyboardShow = (e: { endCoordinates: { height: number } }) => {
      const height = e.endCoordinates.height
      setKeyboardHeight(height)
      Animated.timing(animatedHeight, {
        toValue: height,
        duration: Platform.OS === 'ios' ? iosDuration : 0,
        useNativeDriver: false,
      }).start()
    }

    const onKeyboardHide = () => {
      setKeyboardHeight(0)
      Animated.timing(animatedHeight, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? iosDuration : 0,
        useNativeDriver: false,
      }).start()
    }

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow)
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide)

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [animatedHeight, iosDuration])

  return { keyboardHeight, animatedHeight }
}
