/**
 * [PROPS]: TodoOutputProps
 * [POS]: Mobile 端任务列表输出
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Circle, CheckCircle, Loader2 } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import type { TodoResult } from './const';
import { useTranslation } from '@/lib/i18n';

interface TodoOutputProps {
  result: TodoResult;
}

export function TodoOutput({ result }: TodoOutputProps) {
  const colors = useThemeColors();
  const { t } = useTranslation('chat');
  const tasks = result.tasks ?? [];
  const completed = result.completed ?? 0;
  const total = result.total ?? tasks.length;

  if (tasks.length === 0) {
    return (
      <View className="border-border/60 bg-muted/30 rounded-lg border px-3 py-2">
        <Text className="text-muted-foreground text-xs">{t('noTasks')}</Text>
      </View>
    );
  }

  return (
    <View className="border-border/60 bg-muted/30 rounded-lg border px-3 py-2.5">
      {/* 进度统计 */}
      <Text className="text-muted-foreground text-xs">
        {t('tasksCompleted', { completed, total })}
      </Text>

      {/* 任务列表 */}
      <View className="mt-2 gap-1">
        {tasks.map((task, index) => (
          <TaskItem key={`${task.title}-${index}`} task={task} colors={colors} />
        ))}
      </View>
    </View>
  );
}

interface TaskItemProps {
  task: { title: string; status: 'pending' | 'in_progress' | 'completed' };
  colors: ReturnType<typeof useThemeColors>;
}

function TaskItem({ task, colors }: TaskItemProps) {
  const isCompleted = task.status === 'completed';
  const isInProgress = task.status === 'in_progress';

  const iconSymbol = isCompleted ? CheckCircle : isInProgress ? Loader2 : Circle;
  const iconColor = isCompleted ? colors.success : isInProgress ? '#3b82f6' : colors.textSecondary;

  return (
    <View className="flex-row items-center gap-2">
      <View className={isInProgress ? 'animate-spin' : undefined}>
        <Icon as={iconSymbol} size={16} color={iconColor} />
      </View>
      <Text
        className={`flex-1 text-sm ${isCompleted ? 'text-muted-foreground line-through' : ''}`}
        numberOfLines={1}>
        {task.title}
      </Text>
    </View>
  );
}
