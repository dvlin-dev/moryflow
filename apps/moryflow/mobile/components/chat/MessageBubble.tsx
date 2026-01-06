/**
 * 消息气泡组件
 *
 * 支持渲染多种消息类型：文本、工具调用、推理过程
 * 新消息带入场动画：用户消息（滑动+淡入）、助手消息（淡入）
 *
 * 重构说明：
 * - 移除了 placeholderMinHeight 逻辑（导致复杂滚动的根源）
 * - AI 占位消息使用简单的 loading 指示器
 */

import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { isTextUIPart, isToolUIPart, isReasoningUIPart } from 'ai';
import type { UIMessage, ToolUIPart, ReasoningUIPart } from 'ai';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme';
import { MessageContent } from './MessageContent';
import { MessageAttachments } from './MessageAttachments';
import { Tool, Reasoning, type ToolState } from '@/components/ai-elements';
import { extractTextFromParts } from '@/lib/chat';
import { getMessageMeta, cleanFileRefMarker } from './ChatInputBar';
import { useMessageAnimation } from './contexts';

// 动画配置
const USER_ANIMATION_DURATION = 300;
const ASSISTANT_ANIMATION_DURATION = 350;
const SLIDE_DISTANCE = 30;

interface MessageBubbleProps {
  message: UIMessage;
  isStreaming?: boolean;
  /** 是否是最后一条消息 */
  isLastMessage?: boolean;
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  isStreaming = false,
  isLastMessage = false,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return <UserMessage message={message} />;
  }

  return (
    <AssistantMessage message={message} isStreaming={isStreaming} isLastMessage={isLastMessage} />
  );
});

// ============ 用户消息 ============

interface UserMessageProps {
  message: UIMessage;
}

function UserMessage({ message }: UserMessageProps) {
  const rawContent = extractTextFromParts(message.parts);
  const { shouldAnimate, markAnimated, setLastUserMessageAnimated } = useMessageAnimation();

  // 从 metadata 读取附件，清理文本中的文件引用标记
  const attachments = React.useMemo(() => getMessageMeta(message).attachments ?? [], [message]);
  const cleanText = React.useMemo(() => cleanFileRefMarker(rawContent), [rawContent]);

  // 在首次渲染时捕获是否需要动画
  const messageIdRef = React.useRef(message.id);
  const needsAnimationRef = React.useRef(shouldAnimate(message.id));

  // 动画值
  const opacity = useSharedValue(needsAnimationRef.current ? 0 : 1);
  const translateX = useSharedValue(needsAnimationRef.current ? SLIDE_DISTANCE : 0);

  // 触发入场动画
  React.useEffect(() => {
    if (needsAnimationRef.current) {
      const msgId = messageIdRef.current;
      setLastUserMessageAnimated(false);

      opacity.value = withTiming(1, {
        duration: USER_ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      translateX.value = withTiming(
        0,
        {
          duration: USER_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(markAnimated)(msgId);
            runOnJS(setLastUserMessageAnimated)(true);
          }
        }
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
    marginBottom: 16,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View className="flex-row justify-end">
        <View className="max-w-[85%]">
          <View className="border-border bg-background min-h-7 rounded-3xl rounded-br-[10px] border px-4 py-[5px] dark:bg-neutral-900">
            <MessageContent content={cleanText} />
          </View>
          {attachments.length > 0 && <MessageAttachments attachments={attachments} />}
        </View>
      </View>
    </Animated.View>
  );
}

// ============ 助手消息 ============

interface AssistantMessageProps {
  message: UIMessage;
  isStreaming: boolean;
  isLastMessage?: boolean;
}

function AssistantMessage({
  message,
  isStreaming: _isStreaming,
  isLastMessage: _isLastMessage = false,
}: AssistantMessageProps) {
  const parts = message.parts ?? [];
  const { shouldAnimate, markAnimated, lastUserMessageAnimated } = useMessageAnimation();

  // 在首次渲染时捕获是否需要动画
  const messageIdRef = React.useRef(message.id);
  const needsAnimationRef = React.useRef(shouldAnimate(message.id));
  const hasAnimated = React.useRef(false);

  // 动画值
  const opacity = useSharedValue(needsAnimationRef.current ? 0 : 1);

  // 触发入场动画
  React.useEffect(() => {
    if (needsAnimationRef.current && !hasAnimated.current) {
      const msgId = messageIdRef.current;

      const startAnimation = () => {
        if (hasAnimated.current) return;
        hasAnimated.current = true;

        opacity.value = withTiming(
          1,
          {
            duration: ASSISTANT_ANIMATION_DURATION,
            easing: Easing.out(Easing.cubic),
          },
          (finished) => {
            if (finished) {
              runOnJS(markAnimated)(msgId);
            }
          }
        );
      };

      if (lastUserMessageAnimated.value) {
        startAnimation();
      } else {
        const timeout = setTimeout(startAnimation, USER_ANIMATION_DURATION + 50);
        return () => clearTimeout(timeout);
      }
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    marginBottom: 16,
  }));

  // 无内容时显示加载指示器
  if (parts.length === 0) {
    return (
      <Animated.View style={animatedStyle}>
        <View className="flex-row justify-start">
          <View className="max-w-[85%]">
            <StreamingIndicator />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <View className="flex-row justify-start">
        <View className="w-[85%]">
          {parts.map((part, index) => (
            <MessagePart key={`${message.id}-part-${index}`} part={part} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ============ 消息部分渲染 ============

interface MessagePartProps {
  part: UIMessage['parts'][number];
}

function MessagePart({ part }: MessagePartProps) {
  if (isTextUIPart(part)) {
    return <MessageContent content={part.text ?? ''} />;
  }

  if (isReasoningUIPart(part)) {
    const reasoningPart = part as ReasoningUIPart;
    return (
      <Reasoning
        content={reasoningPart.text ?? ''}
        isStreaming={reasoningPart.state === 'streaming'}
      />
    );
  }

  if (isToolUIPart(part)) {
    const toolPart = part as ToolUIPart;
    const toolName = toolPart.type.startsWith('tool-') ? toolPart.type.slice(5) : toolPart.type;
    return (
      <Tool
        type={toolName}
        state={toolPart.state as ToolState}
        input={toolPart.input as Record<string, unknown> | undefined}
        output={toolPart.output}
        errorText={toolPart.errorText}
      />
    );
  }

  return null;
}

// ============ 流式加载指示器 ============

function StreamingIndicator() {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center py-2">
      <ActivityIndicator size="small" color={colors.spinner} />
      <Text className="text-muted-foreground ml-2">思考中...</Text>
    </View>
  );
}
