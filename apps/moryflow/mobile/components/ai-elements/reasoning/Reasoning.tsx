/**
 * Reasoning 组件
 *
 * 显示 AI 的思考过程，可折叠展开
 */

import * as React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { ChevronDown } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import { MessageContent } from '@/components/chat/MessageContent';
import { useTranslation } from '@/lib/i18n';
import { type ReasoningProps } from './const';
import { resolveReasoningOpenState } from '@moryflow/agents-runtime/ui-message/visibility-policy';
import { getNextManualOpenPreference, resolveOpenStateFromPreference } from '../open-preference';

export function Reasoning({ content, isStreaming = false }: ReasoningProps) {
  const colors = useThemeColors();
  const { t } = useTranslation('chat');
  const [userOpenPreference, setUserOpenPreference] = React.useState<boolean | null>(null);
  const autoOpen = resolveReasoningOpenState({
    isStreaming,
    hasManualExpanded: false,
  });
  const isOpen = resolveOpenStateFromPreference({
    manualOpenPreference: userOpenPreference,
    autoOpen,
  });

  const handleToggle = React.useCallback(() => {
    setUserOpenPreference((prev) =>
      getNextManualOpenPreference({
        manualOpenPreference: prev,
        autoOpen,
      })
    );
  }, [autoOpen]);

  return (
    <View className="mb-3">
      {/* Header */}
      <Pressable
        className="flex-row items-center gap-2 py-0.5 active:opacity-70"
        onPress={handleToggle}>
        <Text className="text-muted-foreground flex-1 text-sm">{t('thinkingProcess')}</Text>
        <Icon
          as={ChevronDown}
          size={16}
          color={colors.textSecondary}
          style={{ transform: [{ rotate: isOpen ? '0deg' : '-90deg' }] }}
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
