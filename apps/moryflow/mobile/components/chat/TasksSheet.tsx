/**
 * [PROPS]: { visible, onClose, activeSessionId } - Tasks 面板开关与会话上下文
 * [EMITS]: onClose()
 * [POS]: Mobile Chat Tasks 面板（列表 + 详情）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import React, { useMemo } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { XIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { TaskRecord } from '@anyhunt/agents-tools';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@anyhunt/agents-tools';
import { useTasks } from '@/lib/hooks/use-tasks';
import type { TaskDetailResult } from '@/lib/agent-runtime/tasks-service';

interface TasksSheetProps {
  visible: boolean;
  onClose: () => void;
  activeSessionId: string | null;
}

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function TasksSheet({ visible, onClose, activeSessionId }: TasksSheetProps) {
  const insets = useSafeAreaInsets();
  const { tasks, detail, selectedTaskId, isLoading, isDetailLoading, error, refresh, selectTask } =
    useTasks({ activeSessionId, enabled: visible });

  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  return (
    <View className="bg-background flex-1">
      <View style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between px-4 pb-3">
          <Text className="text-foreground text-[17px] font-semibold">Tasks</Text>
          <Pressable className="h-10 w-10 items-center justify-center" onPress={onClose}>
            <Icon as={XIcon} size={22} />
          </Pressable>
        </View>
      </View>

      <View className="px-4 pb-2">
        <Pressable
          onPress={() => void refresh()}
          className="border-border self-start rounded-full border px-3 py-1">
          <Text className="text-foreground text-[12px]">Refresh</Text>
        </Pressable>
      </View>

      {error && (
        <View className="border-destructive/30 bg-destructive/10 mx-4 mb-3 rounded-xl border px-3 py-2">
          <Text className="text-destructive text-[12px]">{error}</Text>
        </View>
      )}

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <SectionHeader title="Task list" meta={`${tasks.length} items`} />

        {tasks.length === 0 ? (
          <View className="items-center justify-center py-10">
            <Text className="text-muted-foreground text-[14px]">
              {isLoading ? 'Loading tasks…' : 'No tasks yet.'}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                selected={task.id === selectedTaskId}
                onSelect={() => void selectTask(task.id)}
              />
            ))}
          </View>
        )}

        <View className="bg-border my-6 h-px" />

        <SectionHeader title="Details" />
        <TaskDetail detail={detail} taskMap={taskMap} isLoading={isDetailLoading} />

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-muted-foreground text-[12px] uppercase">{title}</Text>
      {meta && <Text className="text-muted-foreground text-[12px]">{meta}</Text>}
    </View>
  );
}

function TaskRow({
  task,
  selected,
  onSelect,
}: {
  task: TaskRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      className={cn('border-border rounded-2xl border px-4 py-3', selected && 'bg-accent')}
      onPress={onSelect}>
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-foreground text-[15px] font-medium" numberOfLines={1}>
            {task.title}
          </Text>
          <Text className="text-muted-foreground mt-1 text-[12px]">
            Updated {formatTimestamp(task.updatedAt)}
          </Text>
        </View>
        <View className="items-end gap-1">
          <Tag label={TASK_STATUS_LABELS[task.status]} />
          <Tag label={TASK_PRIORITY_LABELS[task.priority]} variant="outline" />
        </View>
      </View>
    </Pressable>
  );
}

function TaskDetail({
  detail,
  taskMap,
  isLoading,
}: {
  detail: TaskDetailResult | null;
  taskMap: Map<string, TaskRecord>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <Text className="text-muted-foreground text-[14px]">Loading details…</Text>;
  }
  if (!detail) {
    return (
      <Text className="text-muted-foreground text-[14px]">Select a task to view details.</Text>
    );
  }

  const { task, dependencies, notes, files } = detail;

  return (
    <View className="gap-3">
      <Text className="text-foreground text-[16px] font-semibold">{task.title}</Text>
      <View className="flex-row flex-wrap gap-2">
        <Tag label={TASK_STATUS_LABELS[task.status]} />
        <Tag label={TASK_PRIORITY_LABELS[task.priority]} variant="outline" />
        <Tag label={task.owner || 'Unassigned'} variant="outline" />
      </View>
      <Text className="text-muted-foreground text-[12px]">
        Updated {formatTimestamp(task.updatedAt)}
      </Text>

      <View className="border-border bg-muted/30 rounded-xl border px-3 py-2">
        <Text className="text-foreground text-[14px]">{task.description || 'No description.'}</Text>
      </View>

      <DetailBlock title="Dependencies">
        {dependencies.length === 0 ? (
          <Text className="text-muted-foreground text-[12px]">No dependencies.</Text>
        ) : (
          dependencies.map((dep) => (
            <Text key={dep.dependsOn} className="text-foreground text-[13px]">
              {taskMap.get(dep.dependsOn)?.title ?? dep.dependsOn}
            </Text>
          ))
        )}
      </DetailBlock>

      <DetailBlock title="Notes">
        {notes.length === 0 ? (
          <Text className="text-muted-foreground text-[12px]">No notes.</Text>
        ) : (
          notes.map((note) => (
            <View key={note.id} className="border-border rounded-xl border px-3 py-2">
              <Text className="text-foreground text-[13px]">{note.body}</Text>
              <Text className="text-muted-foreground mt-1 text-[11px]">
                {note.author} · {formatTimestamp(note.createdAt)}
              </Text>
            </View>
          ))
        )}
      </DetailBlock>

      <DetailBlock title="Files">
        {files.length === 0 ? (
          <Text className="text-muted-foreground text-[12px]">No files.</Text>
        ) : (
          files.map((file) => (
            <Text key={`${file.path}-${file.role}`} className="text-foreground text-[13px]">
              {file.path} ({file.role})
            </Text>
          ))
        )}
      </DetailBlock>
    </View>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-muted-foreground text-[12px] uppercase">{title}</Text>
      {children}
    </View>
  );
}

function Tag({ label, variant = 'solid' }: { label: string; variant?: 'solid' | 'outline' }) {
  const base = 'px-2 py-0.5 rounded-full text-[11px]';
  if (variant === 'outline') {
    return <Text className={cn(base, 'border-border text-foreground border')}>{label}</Text>;
  }
  return <Text className={cn(base, 'bg-accent text-foreground')}>{label}</Text>;
}
