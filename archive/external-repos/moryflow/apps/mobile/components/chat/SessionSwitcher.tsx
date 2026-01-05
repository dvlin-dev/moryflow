/**
 * 会话切换面板
 *
 * 以 ActionSheet 样式显示会话列表，支持切换和删除
 */

import React from 'react';
import { View, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2Icon, CheckIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme';
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

  const handleSelect = (sessionId: string) => {
    onSelect(sessionId);
    onClose();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-card">
        {/* Header - 使用 style 处理动态 insets */}
        <View style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center justify-between px-4 pb-3 border-b border-border/10">
            <View className="w-[60px]" />
            <Text className="text-[17px] font-semibold text-foreground">对话历史</Text>
            <Pressable className="w-[60px] items-end" onPress={onClose}>
              <Text className="text-[17px] font-medium text-primary">完成</Text>
            </Pressable>
          </View>
        </View>

        {/* Session List */}
        <ScrollView className="flex-1 px-4 pt-2" showsVerticalScrollIndicator={false}>
          {sessions.length === 0 ? (
            <View className="flex-1 items-center justify-center py-10">
              <Text className="text-[15px] text-muted-foreground">没有历史对话</Text>
            </View>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <View key={session.id} className="flex-row items-center mb-1">
                  <Pressable
                    className={cn(
                      'flex-1 flex-row items-center justify-between py-3 px-3 rounded-[10px]',
                      isActive && 'bg-muted'
                    )}
                    onPress={() => handleSelect(session.id)}
                  >
                    <View className="flex-1 mr-2">
                      <Text className="text-base font-medium mb-0.5 text-foreground" numberOfLines={1}>
                        {session.title}
                      </Text>
                      <Text className="text-[13px] text-muted-foreground">{formatDate(session.updatedAt)}</Text>
                    </View>
                    {isActive && <CheckIcon size={18} color={colors.primary} />}
                  </Pressable>

                  {/* Delete button (don't show for active session if it's the only one) */}
                  {(sessions.length > 1 || !isActive) && (
                    <Pressable className="w-10 h-10 items-center justify-center" onPress={() => onDelete(session.id)}>
                      <Trash2Icon size={18} color={colors.destructive} />
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
