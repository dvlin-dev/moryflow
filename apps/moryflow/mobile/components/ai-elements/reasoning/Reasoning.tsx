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
import { useTranslation } from '@/lib/i18n';
import { type ReasoningProps } from './const';
import {
  resolveInitialReasoningOpen,
  resolveReasoningVisibilityAction,
} from '@/lib/chat/visibility-transitions';

export function Reasoning({ content, isStreaming = false, defaultOpen }: ReasoningProps) {
  const colors = useThemeColors();
  const { t } = useTranslation('chat');
  const [isOpen, setIsOpen] = React.useState(() =>
    resolveInitialReasoningOpen({ defaultOpen, isStreaming })
  );
  const previousStreaming = React.useRef(isStreaming);
  const hasManualExpanded = React.useRef(false);

  React.useEffect(() => {
    const visibilityAction = resolveReasoningVisibilityAction({
      wasStreaming: previousStreaming.current,
      isStreaming,
      isOpen,
      hasManualExpanded: hasManualExpanded.current,
    });

    if (visibilityAction === 'expand') {
      setIsOpen(true);
    } else if (visibilityAction === 'collapse') {
      setIsOpen(false);
    }

    previousStreaming.current = isStreaming;
  }, [isOpen, isStreaming]);

  const handleToggle = React.useCallback(() => {
    setIsOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        hasManualExpanded.current = true;
      }
      return nextOpen;
    });
  }, []);

  return (
    <View className="mb-3">
      {/* Header */}
      <Pressable
        className="flex-row items-center gap-2 py-0.5 active:opacity-70"
        onPress={handleToggle}>
        <Icon as={Brain} size={16} color={colors.textSecondary} />
        <Text className="text-muted-foreground flex-1 text-sm">{t('thinkingProcess')}</Text>
        <Icon
          as={ChevronDown}
          size={16}
          color={colors.textSecondary}
          style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {/* Content */}
      {isOpen && content && (
        <View className="mt-2">
          <MessageContent content={content} />
        </View>
      )}
    </View>
  );
}
