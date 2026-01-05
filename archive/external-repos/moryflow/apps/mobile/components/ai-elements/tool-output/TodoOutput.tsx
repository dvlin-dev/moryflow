/**
 * Todo 输出组件
 */

import * as React from 'react'
import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import { Circle, CheckCircle, Loader2 } from 'lucide-react-native'
import { useThemeColors } from '@/lib/theme'
import type { TodoResult } from './const'

interface TodoOutputProps {
  result: TodoResult
}

export function TodoOutput({ result }: TodoOutputProps) {
  const colors = useThemeColors()
  const tasks = result.tasks ?? []
  const completed = result.completed ?? 0
  const total = result.total ?? tasks.length

  if (tasks.length === 0) {
    return (
      <View className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        <Text className="text-xs text-muted-foreground">暂无任务</Text>
      </View>
    )
  }

  return (
    <View className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
      {/* 进度统计 */}
      <Text className="text-xs text-muted-foreground">
        {completed} / {total} 任务已完成
      </Text>

      {/* 任务列表 */}
      <View className="mt-2 gap-1">
        {tasks.map((task, index) => (
          <TaskItem key={`${task.title}-${index}`} task={task} colors={colors} />
        ))}
      </View>
    </View>
  )
}

interface TaskItemProps {
  task: { title: string; status: 'pending' | 'in_progress' | 'completed' }
  colors: ReturnType<typeof useThemeColors>
}

function TaskItem({ task, colors }: TaskItemProps) {
  const isCompleted = task.status === 'completed'
  const isInProgress = task.status === 'in_progress'

  const Icon = isCompleted ? CheckCircle : isInProgress ? Loader2 : Circle
  const iconColor = isCompleted
    ? colors.success
    : isInProgress
      ? '#3b82f6'
      : colors.textSecondary

  return (
    <View className="flex-row items-center gap-2">
      <View className={isInProgress ? 'animate-spin' : undefined}>
        <Icon size={16} color={iconColor} />
      </View>
      <Text
        className={`text-sm flex-1 ${isCompleted ? 'text-muted-foreground line-through' : ''}`}
        numberOfLines={1}
      >
        {task.title}
      </Text>
    </View>
  )
}
