/**
 * [PROPS]: { taskState } - 当前 active session 的轻量 task snapshot
 * [EMITS]: 无
 * [POS]: ChatFooter 悬浮任务面板（snapshot-only checklist）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useEffect, useId, useMemo, useState } from 'react';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import type { TaskState, TaskStatus, TaskItem } from '@moryflow/agents-runtime';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { ChevronDown, ChevronUp, Circle, CircleCheck, LoaderCircle } from 'lucide-react';

type TaskHoverPanelProps = {
  taskState?: TaskState;
};

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = {
  in_progress: LoaderCircle,
  todo: Circle,
  done: CircleCheck,
};

type TaskItemTone = 'default' | 'muted' | 'danger';

const getTaskItemTone = (status: TaskStatus): TaskItemTone => {
  switch (status) {
    case 'done':
      return 'muted';
    default:
      return 'default';
  }
};

const TASK_TONE_CLASS: Record<TaskItemTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  danger: 'text-destructive',
};

export const TaskHoverPanel = ({ taskState }: TaskHoverPanelProps) => {
  const { t } = useTranslation('chat');
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const tasks = taskState?.items ?? [];

  useEffect(() => {
    setExpanded(false);
  }, [taskState?.updatedAt]);

  const summaryTask = useMemo(
    () => tasks.find((task) => task.status === 'in_progress') ?? tasks[0] ?? null,
    [tasks]
  );
  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === 'done').length,
    [tasks]
  );

  if (tasks.length === 0) {
    return null;
  }

  const summaryText = summaryTask?.title ?? t('taskPanelIdle');
  const SummaryIcon = summaryTask ? STATUS_ICONS[summaryTask.status] : Circle;
  const progressText = `${completedCount}/${tasks.length}`;

  const handleToggleExpanded = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <div className="pointer-events-auto w-full">
      <div
        className={cn(
          'w-full rounded-xl border border-border/70 bg-background/95 shadow-sm backdrop-blur',
          'transition-[box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          expanded && 'shadow-md'
        )}
      >
        <button
          type="button"
          onClick={handleToggleExpanded}
          aria-label={expanded ? t('collapse') : t('expand')}
          aria-expanded={expanded}
          aria-controls={listId}
          className={cn(
            'group flex w-full items-center gap-2 px-2.5 py-2 text-xs text-left',
            expanded && 'border-b border-border/60'
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <SummaryIcon
              className={cn(
                'size-3',
                summaryTask?.status === 'in_progress' && 'animate-spin',
                summaryTask ? 'text-foreground' : 'text-muted-foreground'
              )}
            />
            <span
              className={cn(
                'truncate text-xs',
                summaryTask ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {summaryText}
            </span>
          </div>
          <div className="w-16 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
            {progressText}
          </div>
          <span className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:text-foreground">
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </span>
        </button>

        <div
          id={listId}
          className={cn(
            'overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
            expanded ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
          )}
        >
          <div className="px-0 py-1.5">
            <ScrollArea className="max-h-64">
              <div className="flex flex-col gap-1 pr-0">
                {tasks.map((task) => (
                  <TaskListItem key={task.id} task={task} />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

type TaskListItemProps = {
  task: TaskItem;
};

const TaskListItem = ({ task }: TaskListItemProps) => {
  const StatusIcon = STATUS_ICONS[task.status];
  const tone = getTaskItemTone(task.status);

  return (
    <div className="mx-2.5 flex w-full items-center gap-2 rounded-lg px-0 py-2 text-left text-xs">
      <StatusIcon
        className={cn(
          'size-3',
          task.status === 'in_progress' && 'animate-spin',
          TASK_TONE_CLASS[tone]
        )}
      />
      <span className={cn('min-w-0 flex-1 truncate text-xs font-medium', TASK_TONE_CLASS[tone])}>
        {task.title}
      </span>
      {task.note ? (
        <span className="max-w-40 truncate text-[11px] text-muted-foreground">{task.note}</span>
      ) : null}
    </div>
  );
};
