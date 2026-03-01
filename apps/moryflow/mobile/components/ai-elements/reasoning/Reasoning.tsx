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
import { AUTO_COLLAPSE_DELAY_MS } from '@moryflow/agents-runtime/ui-message/visibility-policy';
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
  const collapseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCollapseTimer = React.useCallback(() => {
    if (!collapseTimerRef.current) {
      return;
    }
    clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = null;
  }, []);

  React.useEffect(() => {
    const visibilityAction = resolveReasoningVisibilityAction({
      wasStreaming: previousStreaming.current,
      isStreaming,
      isOpen,
      hasManualExpanded: hasManualExpanded.current,
    });

    if (visibilityAction === 'expand') {
      clearCollapseTimer();
      setIsOpen(true);
    } else if (visibilityAction === 'collapse-delayed') {
      clearCollapseTimer();
      collapseTimerRef.current = setTimeout(() => {
        setIsOpen(false);
        collapseTimerRef.current = null;
      }, AUTO_COLLAPSE_DELAY_MS);
    }

    previousStreaming.current = isStreaming;
  }, [clearCollapseTimer, isOpen, isStreaming]);

  React.useEffect(() => () => clearCollapseTimer(), [clearCollapseTimer]);

  const handleToggle = React.useCallback(() => {
    setIsOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        hasManualExpanded.current = true;
        clearCollapseTimer();
      }
      return nextOpen;
    });
  }, [clearCollapseTimer]);

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
