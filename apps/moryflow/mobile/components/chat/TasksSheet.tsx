/**
 * [PROPS]: { onClose, taskState } - 关闭事件与当前会话 task snapshot
 * [EMITS]: onClose()
 * [POS]: Mobile Chat Tasks 面板（snapshot-only checklist）
 * [UPDATE]: 2026-03-07 - 改为只读 checklist，删除 refresh/detail/selection/metadata 区块
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import React, { useMemo } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TaskState } from '@moryflow/agents-runtime';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { CheckCircle, Circle, Loader2, XIcon } from '@/components/ui/icons';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { buildTaskSheetRows, TASK_STATUS_LABEL_KEYS, type TaskSheetRow } from './tasks-sheet-model';

interface TasksSheetProps {
  onClose: () => void;
  taskState?: TaskState;
}

const STATUS_ICONS = {
  todo: Circle,
  in_progress: Loader2,
  done: CheckCircle,
} as const;

export function TasksSheet({ onClose, taskState }: TasksSheetProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('chat');
  const rows = useMemo(() => buildTaskSheetRows(taskState), [taskState]);
  const completedCount = useMemo(
    () => rows.filter((task) => task.status === 'done').length,
    [rows]
  );

  return (
    <View className="bg-background flex-1">
      <View style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between px-4 pb-3">
          <Text className="text-foreground text-[17px] font-semibold">{t('tasksSheetTitle')}</Text>
          <Pressable className="h-10 w-10 items-center justify-center" onPress={onClose}>
            <Icon as={XIcon} size={22} />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <SectionHeader title={t('taskListTitle')} meta={t('itemsCount', { count: rows.length })} />

        {rows.length === 0 ? (
          <View className="items-center justify-center py-10">
            <Text className="text-muted-foreground text-[14px]">{t('noTasksYet')}</Text>
          </View>
        ) : (
          <View className="gap-3">
            <View className="border-border bg-muted/30 rounded-2xl border px-4 py-3">
              <Text className="text-muted-foreground text-[12px]">
                {t('tasksCompleted', { completed: completedCount, total: rows.length })}
              </Text>
            </View>

            <View className="gap-2">
              {rows.map((task) => (
                <TaskRow key={task.id} task={task} label={t(TASK_STATUS_LABEL_KEYS[task.status])} />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-muted-foreground text-[12px] uppercase">{title}</Text>
      {meta ? <Text className="text-muted-foreground text-[12px]">{meta}</Text> : null}
    </View>
  );
}

function TaskRow({ task, label }: { task: TaskSheetRow; label: string }) {
  const IconSymbol = STATUS_ICONS[task.status];
  const isDone = task.status === 'done';
  const isRunning = task.status === 'in_progress';

  return (
    <View className="border-border rounded-2xl border px-4 py-3">
      <View className="flex-row items-start gap-3">
        <Icon
          as={IconSymbol}
          size={18}
          className={cn(
            'mt-0.5 shrink-0',
            isDone && 'text-muted-foreground',
            isRunning && 'text-foreground'
          )}
        />
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between gap-3">
            <Text
              className={cn(
                'flex-1 text-[15px] font-medium',
                isDone ? 'text-muted-foreground line-through' : 'text-foreground'
              )}>
              {task.title}
            </Text>
            <Text className="text-muted-foreground text-[11px] uppercase">{label}</Text>
          </View>
          {task.note ? (
            <Text className="text-muted-foreground text-[12px]">{task.note}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
