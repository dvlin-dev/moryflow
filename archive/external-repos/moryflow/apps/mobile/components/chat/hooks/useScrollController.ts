/**
 * useScrollController
 *
 * 统一管理聊天消息列表的滚动行为：
 * - 初始滚动：页面打开时隐藏列表，滚动到底部后显示
 * - 新消息滚动：用户发送消息强制滚动，AI 回复时如果在底部则滚动
 * - 滚动状态跟踪：是否在底部、是否显示滚动按钮
 *
 * 重构说明：
 * - 移除了 placeholderMinHeight 监听（导致两次滚动的根源）
 * - 新消息检测移入 handleContentSizeChange 同步执行，避免时序问题
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { FlatList, NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent } from 'react-native'
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import type { UIMessage } from '@ai-sdk/react'

interface UseScrollControllerOptions {
  /** FlatList ref */
  listRef: RefObject<FlatList<UIMessage> | null>
  /** 消息列表 */
  messages: UIMessage[]
  /** 是否在底部（SharedValue，用于 worklet） */
  isAtEnd: SharedValue<boolean>
  /** 键盘高度（用于键盘弹起时滚动） */
  keyboardHeight: SharedValue<number>
}

interface ScrollController {
  /** 滚动到底部 */
  scrollToBottom: (animated?: boolean) => void
  /** 增量滚动（相对于当前位置） */
  scrollBy: (delta: number, animated?: boolean) => void
  /** 滚动事件处理 */
  handleScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void
  /** 内容大小变化处理 */
  handleContentSizeChange: (width: number, height: number) => void
  /** 布局变化处理 */
  handleLayout: (e: LayoutChangeEvent) => void
  /** scrollToIndex 失败处理 */
  handleScrollToIndexFailed: () => void
  /** 是否显示滚动到底部按钮 */
  showScrollButton: boolean
  /** 是否准备好显示（首次渲染完成） */
  isReady: boolean
}

// 判断是否在底部的阈值（px）
const AT_END_THRESHOLD = 100

export function useScrollController({
  listRef,
  messages,
  isAtEnd,
  keyboardHeight,
}: UseScrollControllerOptions): ScrollController {
  // 是否处于初始加载阶段（首次打开页面，内容还在渲染中）
  const isInitialLoadRef = useRef(true)
  // 初始加载稳定检测 timer
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 上次消息数量（用于检测新消息）
  const prevMessageCountRef = useRef(messages.length)
  // 内容高度记录（用于判断高度变化量）
  const contentHeightRef = useRef(0)
  // 布局高度记录
  const layoutHeightRef = useRef(0)
  // 当前滚动位置
  const scrollOffsetRef = useRef(0)

  // 滚动按钮显示状态
  const [showScrollButton, setShowScrollButton] = useState(false)
  // 是否准备好显示（首次渲染滚动完成后）
  const [isReady, setIsReady] = useState(false)

  // 滚动到底部
  const scrollToBottom = useCallback(
    (animated = true) => {
      isAtEnd.value = true
      listRef.current?.scrollToEnd({ animated })
    },
    [isAtEnd, listRef]
  )

  // 增量滚动（相对于当前位置）
  const scrollBy = useCallback(
    (delta: number, animated = true) => {
      const newOffset = scrollOffsetRef.current + delta
      listRef.current?.scrollToOffset({
        offset: Math.max(0, newOffset),
        animated,
      })
    },
    [listRef]
  )

  // 监听 isAtEnd 变化，更新滚动按钮显示
  useAnimatedReaction(
    () => isAtEnd.value,
    (atEnd) => {
      runOnJS(setShowScrollButton)(!atEnd)
    },
    []
  )

  // 监听键盘高度变化
  useAnimatedReaction(
    () => keyboardHeight.value,
    (height, prevHeight) => {
      const prev = prevHeight ?? 0
      // 键盘弹起时，如果在底部则滚动
      if (height > prev && isAtEnd.value) {
        runOnJS(scrollToBottom)(true)
      }
    },
    [scrollToBottom]
  )

  // 滚动事件处理 - 判断是否在底部 + 边界检查
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent

      // 记录当前滚动位置
      scrollOffsetRef.current = contentOffset.y

      // 边界检查：防止向上滚动超过内容顶部
      if (contentOffset.y < 0) {
        listRef.current?.scrollToOffset({ offset: 0, animated: false })
        return
      }

      const maxOffset = contentSize.height - layoutMeasurement.height
      const atEnd = contentOffset.y >= maxOffset - AT_END_THRESHOLD

      isAtEnd.value = atEnd
    },
    [isAtEnd, listRef]
  )

  // 内容大小变化处理
  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      const prevHeight = contentHeightRef.current
      contentHeightRef.current = height

      // 初始加载阶段：持续滚动到底部，直到高度稳定
      if (isInitialLoadRef.current && height > 0) {
        listRef.current?.scrollToEnd({ animated: false })

        // Debounce：高度稳定 100ms 后设置 isReady
        if (readyTimerRef.current) {
          clearTimeout(readyTimerRef.current)
        }
        readyTimerRef.current = setTimeout(() => {
          listRef.current?.scrollToEnd({ animated: false })
          requestAnimationFrame(() => {
            isInitialLoadRef.current = false
            setIsReady(true)
          })
        }, 100)
        return
      }

      // 正常阶段：内容高度增加时，如果在底部则滚动
      // 这是唯一的滚动触发点，统一处理新消息和流式输出
      if (height > prevHeight && isAtEnd.value) {
        const layoutHeight = layoutHeightRef.current
        const maxOffset = Math.max(0, height - layoutHeight)

        // 直接滚动，不使用 requestAnimationFrame（避免延迟）
        const useAnimation = height - prevHeight < 500
        listRef.current?.scrollToOffset({
          offset: maxOffset,
          animated: useAnimation,
        })
      }
    },
    [listRef, isAtEnd]
  )

  // 布局变化处理
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    layoutHeightRef.current = e.nativeEvent.layout.height
  }, [])

  // 监听 messages 变化，设置滚动标志
  // 实际滚动由 handleContentSizeChange 统一处理
  useEffect(() => {
    // 忽略初始加载阶段
    if (isInitialLoadRef.current) {
      return
    }

    const currentCount = messages.length
    const prevCount = prevMessageCountRef.current

    if (currentCount > prevCount) {
      const newMessages = messages.slice(prevCount)
      const hasUserMessage = newMessages.some((m) => m.role === 'user')

      if (hasUserMessage) {
        // 用户发送消息：强制设置 isAtEnd，确保后续滚动
        isAtEnd.value = true
      }
      // AI 回复时不改变 isAtEnd 状态，保持用户的滚动位置

      prevMessageCountRef.current = currentCount
    }
  }, [messages, isAtEnd])

  // scrollToIndex 失败时的回退处理
  const handleScrollToIndexFailed = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false })
    }, 100)
  }, [listRef])

  return {
    scrollToBottom,
    scrollBy,
    handleScroll,
    handleContentSizeChange,
    handleLayout,
    handleScrollToIndexFailed,
    showScrollButton,
    isReady,
  }
}
