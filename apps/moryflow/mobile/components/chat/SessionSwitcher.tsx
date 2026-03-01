/**
 * 会话切换面板
 *
 * 以 ActionSheet 样式显示会话列表，支持切换和删除
 */

import React from 'react';
import { View, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2Icon, CheckIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme';
import { useLanguage, useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ChatSessionSummary } from '@moryflow/agents-runtime';

interface SessionSwitcherProps {
  visible: boolean;
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onClose: () => void;
}

export function SessionSwitcher({
  visible,
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  onClose,
}: SessionSwitcherProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t } = useTranslation('chat');
  const { currentLanguage } = useLanguage();

  const handleSelect = (sessionId: string) => {
    onSelect(sessionId);
    onClose();
  };

  const formatDate = (timestamp: number) => {
    const localeByLanguage: Record<string, string> = {
      'zh-CN': 'zh-CN',
      en: 'en-US',
      ja: 'ja-JP',
      de: 'de-DE',
      ar: 'ar-EG',
    };
    const locale = localeByLanguage[currentLanguage] ?? 'en-US';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View className="bg-card flex-1">
        {/* Header - 使用 style 处理动态 insets */}
        <View style={{ paddingTop: insets.top + 12 }}>
          <View className="border-border/10 flex-row items-center justify-between border-b px-4 pb-3">
            <View className="w-[60px]" />
            <Text className="text-foreground text-[17px] font-semibold">
              {t('conversationHistoryTitle')}
            </Text>
            <Pressable className="w-[60px] items-end" onPress={onClose}>
              <Text className="text-primary text-[17px] font-medium">{t('doneAction')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Session List */}
        <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>
          {sessions.length === 0 ? (
            <View className="flex-1 items-center justify-center py-10">
              <Text className="text-muted-foreground text-[15px]">
                {t('noConversationHistory')}
              </Text>
            </View>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <View key={session.id} className="mb-1 flex-row items-center">
                  <Pressable
                    className={cn(
                      'flex-1 flex-row items-center justify-between rounded-[10px] px-3 py-3',
                      isActive && 'bg-muted'
                    )}
                    onPress={() => handleSelect(session.id)}>
                    <View className="mr-2 flex-1">
                      <Text
                        className="text-foreground mb-0.5 text-base font-medium"
                        numberOfLines={1}>
                        {session.title}
                      </Text>
                      <Text className="text-muted-foreground text-[13px]">
                        {formatDate(session.updatedAt)}
                      </Text>
                    </View>
                    {isActive && <Icon as={CheckIcon} size={18} color={colors.primary} />}
                  </Pressable>

                  {/* Delete button (don't show for active session if it's the only one) */}
                  {(sessions.length > 1 || !isActive) && (
                    <Pressable
                      className="h-10 w-10 items-center justify-center"
                      onPress={() => onDelete(session.id)}>
                      <Icon as={Trash2Icon} size={18} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
