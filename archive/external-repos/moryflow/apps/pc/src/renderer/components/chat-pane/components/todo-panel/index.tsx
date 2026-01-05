import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, ChevronRight, Circle, Loader2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import type { PlanSnapshot, PlanTask } from '@shared/ipc'

type TodoPanelProps = {
  data?: PlanSnapshot | null
}

export const TodoPanel = ({ data }: TodoPanelProps) => {
  const { t } = useTranslation('chat')
  const [expanded, setExpanded] = useState(false)

  if (!data || data.tasks.length === 0) {
    return null
  }

  const { tasks, completed, total } = data
  const hasInProgress = tasks.some((task) => task.status === 'in_progress')

  return (
    <div data-align="block-start" className="w-full rounded-t-xl border-b border-border/40 bg-muted/30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="group flex w-full items-center justify-start gap-2 rounded-t-xl px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
      >
        <span className="relative size-3.5">
          {hasInProgress && !expanded && (
            <Loader2 className="absolute inset-0 size-3.5 animate-spin text-blue-500 group-hover:opacity-0 transition-opacity" />
          )}
          <ChevronRight
            className={cn(
              'absolute inset-0 size-3.5 transition-all',
              expanded ? 'rotate-90 opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          />
          {!hasInProgress && !expanded && (
            <ChevronRight className="absolute inset-0 size-3.5" />
          )}
        </span>
        <span>
          {t('tasksCompleted', { completed, total })}
        </span>
      </button>
      {expanded && (
        <div className="space-y-1 px-3 pb-2.5">
          {tasks.map((task, index) => (
            <TaskItem key={`${task.title}-${index}`} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}

const TaskItem = ({ task }: { task: PlanTask }) => {
  const isCompleted = task.status === 'completed'
  const isInProgress = task.status === 'in_progress'

  return (
    <div className="flex items-center gap-2 text-sm">
      {isCompleted ? (
        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
      ) : isInProgress ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-blue-500" />
      ) : (
        <Circle className="size-4 shrink-0 text-muted-foreground/50" />
      )}
      <span className={cn('truncate', isCompleted && 'text-muted-foreground line-through')}>
        {task.title}
      </span>
    </div>
  )
}
