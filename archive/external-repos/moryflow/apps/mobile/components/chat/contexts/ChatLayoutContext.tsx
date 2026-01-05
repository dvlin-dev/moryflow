/**
 * ChatLayoutContext
 *
 * 统一管理聊天界面的布局相关状态：
 * - 键盘高度和可见状态
 * - 输入框（Composer）高度
 * - 计算属性：底部间距
 *
 * 合并了原来的 KeyboardStateContext 和 ComposerHeightContext
 */

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react'
import { useSharedValue, useDerivedValue } from 'react-native-reanimated'
import { useKeyboardHandler } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { SharedValue } from 'react-native-reanimated'

interface ChatLayoutContextValue {
  /** 键盘高度 SharedValue */
  keyboardHeight: SharedValue<number>
  /** 键盘是否可见 */
  isKeyboardVisible: SharedValue<boolean>
  /** 输入框高度 SharedValue */
  composerHeight: SharedValue<number>
  /** 设置输入框高度（从 onLayout 调用） */
  setComposerHeight: (height: number) => void
  /** 底部安全区域 */
  bottomSafeArea: number
  /** 底部间距：键盘高度 + 输入框高度 + 安全区域 + margin */
  bottomInset: SharedValue<number>
}

const ChatLayoutContext = createContext<ChatLayoutContextValue | null>(null)

interface ChatLayoutProviderProps {
  children: ReactNode
  /** 是否在 Sheet 模式中（影响安全区域计算） */
  isInSheet?: boolean
}

export function ChatLayoutProvider({ children, isInSheet = false }: ChatLayoutProviderProps) {
  const insets = useSafeAreaInsets()

  // 键盘状态
  const keyboardHeight = useSharedValue(0)
  const isKeyboardVisible = useSharedValue(false)

  // 输入框高度
  const composerHeight = useSharedValue(0)

  // 监听键盘事件
  useKeyboardHandler(
    {
      onStart: (event) => {
        'worklet'
        keyboardHeight.value = Math.max(event.height, 0)
        isKeyboardVisible.value = event.height > 0
      },
      onMove: (event) => {
        'worklet'
        keyboardHeight.value = Math.max(event.height, 0)
        isKeyboardVisible.value = event.height > 0
      },
      onInteractive: (event) => {
        'worklet'
        // 交互式拖动键盘时实时更新高度
        keyboardHeight.value = Math.max(event.height, 0)
        isKeyboardVisible.value = event.height > 0
      },
      onEnd: (event) => {
        'worklet'
        // 确保键盘完全收起时高度为 0
        keyboardHeight.value = Math.max(event.height, 0)
        isKeyboardVisible.value = event.height > 0
      },
    },
    []
  )

  // 底部安全区域（Sheet 模式下使用固定值）
  const bottomSafeArea = isInSheet ? 12 : insets.bottom + 8

  // 计算底部间距（派生值，在 worklet 中高效更新）
  const bottomInset = useDerivedValue(() => {
    // 底部间距 = 输入框高度 + 安全区域 + 键盘高度 + 内容与输入框的间距(16)
    return composerHeight.value + bottomSafeArea + keyboardHeight.value + 16
  })

  // 设置输入框高度
  const setComposerHeight = useCallback(
    (height: number) => {
      composerHeight.value = height
    },
    [composerHeight]
  )

  const value = useMemo(
    () => ({
      keyboardHeight,
      isKeyboardVisible,
      composerHeight,
      setComposerHeight,
      bottomSafeArea,
      bottomInset,
    }),
    [keyboardHeight, isKeyboardVisible, composerHeight, setComposerHeight, bottomSafeArea, bottomInset]
  )

  return <ChatLayoutContext.Provider value={value}>{children}</ChatLayoutContext.Provider>
}

/**
 * 使用聊天布局 Hook
 */
export function useChatLayout() {
  const context = useContext(ChatLayoutContext)
  if (!context) {
    throw new Error('useChatLayout must be used within ChatLayoutProvider')
  }
  return context
}
