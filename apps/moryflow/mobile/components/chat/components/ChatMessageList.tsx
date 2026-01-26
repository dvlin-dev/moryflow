/**
 * ChatMessageList
 *
 * 高性能虚拟消息列表，使用 React Native 原生 FlatList
 *
 * 使用普通 FlatList（不使用 inverted）：
 * - 数据保持原始顺序：[旧, ..., 新]
 * - 最新消息显示在底部
 * - 使用 scrollToEnd() 滚动到最新消息
 *
 * 重构说明：
 * - 移除了复杂的 aiMinHeight 计算（导致两次滚动的根源）
 * - AI 占位消息使用固定 loading 高度，依赖滚动控制器确保消息可见
 */

import React, { useCallback, useRef } from 'react';
import { View, useWindowDimensions, FlatList, ActivityIndicator } from 'react-native';
import type { FlatList as FlatListType } from 'react-native';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UIMessage } from '@ai-sdk/react';
import { useChatLayout, useMessageList } from '../contexts';
import { useScrollController } from '../hooks/useScrollController';
import { MessageBubble } from '../MessageBubble';
import { ScrollToBottomButton } from './ScrollToBottomButton';

interface ChatMessageListProps {
  messages: UIMessage[];
  isStreaming?: boolean;
  isInSheet?: boolean;
  onToolApproval?: (input: { approvalId: string; remember: 'once' | 'always' }) => void;
}

// 布局常量
const HEADER_HEIGHT = 68;
const HEADER_EXTRA_TOP = 8;
// 底部高度（输入框约 120 + 安全区域约 34 + margin 16）
const DEFAULT_BOTTOM_HEIGHT = 170;

export function ChatMessageList({
  messages,
  isStreaming = false,
  isInSheet = false,
  onToolApproval,
}: ChatMessageListProps) {
  const listRef = useRef<FlatListType<UIMessage>>(null);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Context
  const { keyboardHeight, composerHeight } = useChatLayout();
  const { isAtEnd } = useMessageList();

  // 滚动控制
  const {
    scrollToBottom,
    scrollBy,
    handleScroll,
    handleContentSizeChange,
    handleLayout,
    handleScrollToIndexFailed,
    showScrollButton,
    isReady,
  } = useScrollController({
    listRef,
    messages,
    isAtEnd,
    keyboardHeight,
  });

  // 计算 Header 高度
  const headerHeight = isInSheet ? HEADER_HEIGHT : insets.top + HEADER_EXTRA_TOP + HEADER_HEIGHT;

  // 监听输入框高度变化，滚动补偿
  // 输入框变高时，需要增加滚动偏移量，保持消息不被遮挡
  useAnimatedReaction(
    () => composerHeight.value,
    (height, prevHeight) => {
      const prev = prevHeight ?? 0;
      const delta = height - prev;
      // 输入框高度增加且在底部时，增加滚动偏移量
      if (delta > 0 && isAtEnd.value) {
        runOnJS(scrollBy)(delta, true);
      }
    },
    [scrollBy]
  );

  // 渲染消息项
  const renderItem = useCallback(
    ({ item, index }: { item: UIMessage; index: number }) => {
      const isLastMessage = index === messages.length - 1;

      return (
        <MessageBubble
          message={item}
          isStreaming={isStreaming && isLastMessage}
          isLastMessage={isLastMessage}
          onToolApproval={onToolApproval}
        />
      );
    },
    [isStreaming, messages.length, onToolApproval]
  );

  // 新会话（无消息）直接返回 null
  if (messages.length === 0) {
    return null;
  }

  const showLoading = !isReady;

  return (
    <View className="relative flex-1">
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        // 滚动事件
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        scrollEventThrottle={16}
        // 首次渲染时隐藏，滚动完成后显示
        style={{ opacity: isReady ? 1 : 0 }}
        // 样式
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: headerHeight,
          paddingBottom: DEFAULT_BOTTOM_HEIGHT,
          minHeight: screenHeight,
        }}
        // 滚动指示器偏移
        scrollIndicatorInsets={{ top: headerHeight, bottom: 0 }}
        showsVerticalScrollIndicator={true}
        // 滚动限制
        bounces={false}
        overScrollMode="never"
        // 键盘处理
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        // 性能优化
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />

      {showLoading && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      )}

      {showScrollButton && <ScrollToBottomButton onPress={() => scrollToBottom(true)} />}
    </View>
  );
}
