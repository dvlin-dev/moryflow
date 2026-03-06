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
 * - 2026-03-06：接入 assistant round 折叠摘要（结束态仅保留结论消息）
 */

import React, { useCallback, useRef, useMemo, useState } from 'react';
import { View, useWindowDimensions, FlatList, ActivityIndicator, Pressable } from 'react-native';
import type { FlatList as FlatListType } from 'react-native';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UIMessage } from '@ai-sdk/react';
import {
  buildAssistantRoundRenderItems,
  formatAssistantRoundDuration,
  resolveAssistantRoundPreferenceScopeKey,
} from '@moryflow/agents-runtime/ui-message/assistant-round-collapse';
import { Icon } from '@/components/ui/icon';
import { ChevronDown } from '@/components/ui/icons';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme';
import { useTranslation } from '@/lib/i18n';
import { useChatLayout, useMessageList } from '../contexts';
import { useScrollController } from '../hooks/useScrollController';
import { MessageBubble } from '../MessageBubble';
import { ScrollToBottomButton } from './ScrollToBottomButton';

interface ChatMessageListProps {
  messages: UIMessage[];
  status?: 'ready' | 'submitted' | 'streaming' | 'error';
  isStreaming?: boolean;
  isInSheet?: boolean;
  threadId?: string | null;
  onToolApproval?: (input: { approvalId: string; remember: 'once' | 'always' }) => void;
}

// 布局常量
const HEADER_HEIGHT = 68;
const HEADER_EXTRA_TOP = 8;
// 底部高度（输入框约 120 + 安全区域约 34 + margin 16）
const DEFAULT_BOTTOM_HEIGHT = 170;
const EMPTY_MANUAL_ROUND_OPEN_BY_ID: Record<string, boolean> = {};

export function ChatMessageList({
  messages,
  status,
  isStreaming = false,
  isInSheet = false,
  threadId,
  onToolApproval,
}: ChatMessageListProps) {
  const listRef = useRef<FlatListType<UIMessage>>(null);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const colors = useThemeColors();
  const { t } = useTranslation('chat');
  const [manualRoundPreferenceState, setManualRoundPreferenceState] = useState<{
    scopeKey: string;
    values: Record<string, boolean>;
  }>({
    scopeKey: '__empty__',
    values: {},
  });

  // Context
  const { keyboardHeight, composerHeight } = useChatLayout();
  const { isAtEnd } = useMessageList();
  const effectiveStatus = status ?? (isStreaming ? 'streaming' : 'ready');
  const roundPreferenceScopeKey = useMemo(
    () => resolveAssistantRoundPreferenceScopeKey({ messages, threadId }),
    [messages, threadId]
  );
  const manualRoundOpenById = useMemo(
    () =>
      manualRoundPreferenceState.scopeKey === roundPreferenceScopeKey
        ? manualRoundPreferenceState.values
        : EMPTY_MANUAL_ROUND_OPEN_BY_ID,
    [manualRoundPreferenceState, roundPreferenceScopeKey]
  );
  const roundRender = useMemo(
    () =>
      buildAssistantRoundRenderItems({
        messages,
        status: effectiveStatus,
        manualOpenPreferenceByRoundId: manualRoundOpenById,
      }),
    [effectiveStatus, manualRoundOpenById, messages]
  );
  const summaryByMessageIndex = useMemo(() => {
    const map = new Map<number, (typeof roundRender.items)[number]>();
    for (const item of roundRender.items) {
      if (item.type !== 'summary') {
        continue;
      }
      map.set(item.round.firstAssistantIndex, item);
    }
    return map;
  }, [roundRender]);

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
      const summary = summaryByMessageIndex.get(index);
      const hiddenByRound = roundRender.hiddenAssistantIndexSet.has(index);
      const isLastMessage = index === messages.length - 1;
      const messageNode = hiddenByRound ? null : (
        <MessageBubble
          message={item}
          isStreaming={isStreaming && isLastMessage}
          isLastMessage={isLastMessage}
          onToolApproval={onToolApproval}
        />
      );

      if (!summary || summary.type !== 'summary') {
        return messageNode;
      }

      const durationText =
        typeof summary.durationMs === 'number'
          ? formatAssistantRoundDuration(summary.durationMs)
          : null;
      const summaryLabel = durationText
        ? t('assistantRoundProcessedWithDuration', { duration: durationText })
        : t('assistantRoundProcessed');
      const toggleLabel = summary.open ? t('assistantRoundCollapse') : t('assistantRoundExpand');

      return (
        <View className="mb-4">
          <View className="mb-2 flex-row items-center">
            <View className="bg-border/50 h-px flex-1" />
            <Pressable
              className="mx-3 flex-row items-center gap-1 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={toggleLabel}
              onPress={() => {
                setManualRoundPreferenceState((prev) => {
                  const currentValues =
                    prev.scopeKey === roundPreferenceScopeKey ? prev.values : {};
                  return {
                    scopeKey: roundPreferenceScopeKey,
                    values: {
                      ...currentValues,
                      [summary.roundId]: !summary.open,
                    },
                  };
                });
              }}>
              <Text className="text-muted-foreground text-xs">{summaryLabel}</Text>
              <Icon
                as={ChevronDown}
                size={14}
                color={colors.textSecondary}
                style={{ transform: [{ rotate: summary.open ? '0deg' : '-90deg' }] }}
              />
            </Pressable>
            <View className="bg-border/50 h-px flex-1" />
          </View>
          {messageNode}
        </View>
      );
    },
    [
      colors.textSecondary,
      isStreaming,
      messages.length,
      onToolApproval,
      roundRender.hiddenAssistantIndexSet,
      summaryByMessageIndex,
      roundPreferenceScopeKey,
      t,
    ]
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
