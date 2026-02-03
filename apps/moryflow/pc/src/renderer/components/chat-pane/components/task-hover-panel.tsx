/**
 * [PROPS]: { activeSessionId, isSessionRunning } - 当前会话 ID + 会话运行态
 * [EMITS]: onSelect(taskId) via useTasks
 * [POS]: ChatFooter 悬浮任务面板（点击展开 + hover 箭头）
 * [UPDATE]: 2026-02-02 - 列表项改为外边距控制 + 错误状态提示
 * [UPDATE]: 2026-01-28 - 任务列表改为仅状态 icon + 标题，隐藏子项详情与交互视觉
 * [UPDATE]: 2026-02-02 - Header 全区域可展开收起 + 子项改为非交互展示
 * [UPDATE]: 2026-02-03 - 仅会话运行且任务执行中时展示面板
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useId, useMemo, useState } from 'react';
import { ScrollArea } from '@anyhunt/ui/components/scroll-area';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { TaskRecord, TaskStatus } from '@shared/ipc';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleX,
  LoaderCircle,
} from 'lucide-react';
import { useTasks } from '../hooks';

type TaskHoverPanelProps = {
  activeSessionId: string | null;
  isSessionRunning: boolean;
};

const STATUS_ORDER: Record<TaskStatus, number> = {
  in_progress: 0,
  blocked: 1,
  todo: 2,
  done: 3,
  failed: 4,
  cancelled: 5,
  archived: 6,
};

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = {
  in_progress: LoaderCircle,
  blocked: AlertTriangle,
  todo: Circle,
  done: CircleCheck,
  failed: CircleX,
  cancelled: CircleDashed,
  archived: CircleDashed,
};

const ACTIVE_TASK_STATUSES: TaskStatus[] = ['in_progress', 'blocked', 'failed'];

export const TaskHoverPanel = ({ activeSessionId, isSessionRunning }: TaskHoverPanelProps) => {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const { tasks, isLoading, clearSelection, error } = useTasks({
    activeSessionId,
    enabled: Boolean(activeSessionId) && isSessionRunning,
  });

  useEffect(() => {
    setExpanded(false);
    clearSelection();
  }, [activeSessionId, isSessionRunning, clearSelection]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((left, right) => {
      const statusDelta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
      if (statusDelta !== 0) return statusDelta;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [tasks]);

  const activeTasks = useMemo(
    () => sortedTasks.filter((task) => ACTIVE_TASK_STATUSES.includes(task.status)),
    [sortedTasks]
  );
  const completedCount = useMemo(
    () => sortedTasks.filter((task) => task.status === 'done').length,
    [sortedTasks]
  );

  const hasActiveTasks = activeTasks.length > 0;
  const showPanel = Boolean(activeSessionId) && isSessionRunning && hasActiveTasks;
  const activeTask = activeTasks[0] ?? null;
  const hasActiveTask = Boolean(activeTask);
  const isBusy = activeTask?.status === 'in_progress';

  if (!showPanel) {
    return null;
  }

  const summaryText = activeTask?.title ?? t('taskPanelIdle');

  const SummaryIcon = activeTask ? STATUS_ICONS[activeTask.status] : CircleDashed;
  const progressText = `${completedCount}/${tasks.length}`;

  const handleToggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      if (!next) {
        clearSelection();
      }
      return next;
    });
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
                isBusy && 'animate-spin',
                hasActiveTask ? 'text-foreground' : 'text-muted-foreground'
              )}
            />
            <span
              className={cn(
                'truncate text-xs',
                hasActiveTask ? 'text-foreground' : 'text-muted-foreground'
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
                {error ? (
                  <div className="mx-2.5 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-0 py-2 text-xs text-muted-foreground">
                    <AlertTriangle className="size-3 text-muted-foreground" />
                    <span>{t('taskPanelLoadFailed')}</span>
                  </div>
                ) : null}
                {sortedTasks.length === 0 && !error ? (
                  <div className="mx-2.5 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-0 py-2 text-xs text-muted-foreground">
                    {isLoading ? (
                      <LoaderCircle className="size-3 animate-spin" />
                    ) : (
                      <CircleDashed className="size-3" />
                    )}
                    <span>{isLoading ? tCommon('loading') : t('noTasks')}</span>
                  </div>
                ) : null}
                {sortedTasks.length > 0
                  ? sortedTasks.map((task) => <TaskListItem key={task.id} task={task} />)
                  : null}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

type TaskListItemProps = {
  task: TaskRecord;
};

const TaskListItem = ({ task }: TaskListItemProps) => {
  const StatusIcon = STATUS_ICONS[task.status];
  const isCompleted = task.status === 'done';
  const isInactive = task.status === 'cancelled' || task.status === 'archived';
  const isFailed = task.status === 'failed';

  return (
    <div className="mx-2.5 flex w-full items-center gap-2 rounded-lg px-0 py-2 text-left text-xs">
      <StatusIcon
        className={cn(
          'size-3',
          task.status === 'in_progress' && 'animate-spin',
          isFailed
            ? 'text-destructive'
            : isCompleted || isInactive
              ? 'text-muted-foreground'
              : 'text-foreground'
        )}
      />
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-xs font-medium',
          isFailed
            ? 'text-destructive'
            : isCompleted || isInactive
              ? 'text-muted-foreground'
              : 'text-foreground'
        )}
      >
        {task.title}
      </span>
    </div>
  );
};
