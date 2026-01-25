/**
 * Reasoning 组件
 *
 * 显示 AI 的思考过程，可折叠展开
 */

import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Brain, ChevronDown } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import { MessageContent } from '@/components/chat/MessageContent';
import { AUTO_CLOSE_DELAY, type ReasoningProps } from './const';

export function Reasoning({ content, isStreaming = false, defaultOpen }: ReasoningProps) {
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = React.useState(defaultOpen ?? isStreaming);
  const hasAutoClosed = React.useRef(false);

  // 流式结束后自动折叠
  React.useEffect(() => {
    if (!isStreaming && isOpen && !hasAutoClosed.current) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        hasAutoClosed.current = true;
      }, AUTO_CLOSE_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, isOpen]);

  const handleToggle = React.useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <View className="border-border/50 bg-muted/20 mb-3 rounded-xl border p-3">
      {/* Header */}
      <Pressable className="flex-row items-center gap-2 active:opacity-70" onPress={handleToggle}>
        <Icon as={Brain} size={16} color={colors.textSecondary} />
        <Text className="text-muted-foreground flex-1 text-sm">
          {isStreaming ? '思考中...' : '思考过程'}
        </Text>
        <Icon
          as={ChevronDown}
          size={16}
          color={colors.textSecondary}
          style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {/* Content */}
      {isOpen && content && (
        <View className="mt-3">
          <MessageContent content={content} />
        </View>
      )}
    </View>
  );
}
