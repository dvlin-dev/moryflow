/**
 * [PROPS]: { activeSessionId } - 当前会话 ID
 * [EMITS]: onSelect(taskId) via useTasks
 * [POS]: ChatFooter 悬浮任务面板（点击展开 + hover 箭头）
 * [UPDATE]: 2026-02-02 - 列表项改为外边距控制 + 错误状态提示
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import { ScrollArea } from '@anyhunt/ui/components/scroll-area';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { TaskRecord, TaskStatus } from '@shared/ipc';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
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

const DESCRIPTION_CLAMP_STYLES: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

export const TaskHoverPanel = ({ activeSessionId }: TaskHoverPanelProps) => {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const {
    tasks,
    detail,
    selectedTaskId,
    isLoading,
    isDetailLoading,
    selectTask,
    clearSelection,
    error,
  } = useTasks({ activeSessionId, enabled: Boolean(activeSessionId) });

  useEffect(() => {
    setExpanded(false);
    clearSelection();
  }, [activeSessionId, clearSelection]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((left, right) => {
      const statusDelta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
      if (statusDelta !== 0) return statusDelta;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [tasks]);

  const activeTasks = useMemo(
    () => sortedTasks.filter((task) => task.status === 'in_progress'),
    [sortedTasks]
  );
  const completedCount = useMemo(
    () => sortedTasks.filter((task) => task.status === 'done').length,
    [sortedTasks]
  );

  const hasTasks = tasks.length > 0;
  const hasError = Boolean(error);
  const showPanel = Boolean(activeSessionId) && (hasTasks || isLoading || hasError);
  const activeTask = activeTasks[0] ?? null;
  const isAllDone = hasTasks && completedCount === tasks.length;
  const hasActiveTask = Boolean(activeTask);
  const isBusy = hasActiveTask || isLoading;

  if (!showPanel) {
    return null;
  }

  const summaryText = activeTask
    ? activeTask.title
    : hasError && !hasTasks
      ? t('taskPanelLoadFailed')
      : isAllDone
        ? t('taskPanelAllCompleted')
        : hasTasks
          ? t('taskPanelIdle')
          : tCommon('loading');

  const SummaryIcon =
    hasError && !hasTasks
      ? AlertTriangle
      : isBusy
        ? LoaderCircle
        : isAllDone
          ? CircleCheck
          : CircleDashed;
  const progressText =
    tasks.length === 0
      ? isLoading || hasError
        ? '--/--'
        : '0/0'
      : `${completedCount}/${tasks.length}`;

  const handleToggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      if (!next) {
        clearSelection();
      }
      return next;
    });
  };

  const handleSelectTask = async (task: TaskRecord) => {
    if (selectedTaskId === task.id) {
      clearSelection();
      return;
    }
    await selectTask(task.id);
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
        <div
          className={cn(
            'flex items-center gap-2 px-2.5 py-2 text-xs',
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
          <button
            type="button"
            onClick={handleToggleExpanded}
            aria-label={expanded ? t('collapse') : t('expand')}
            aria-expanded={expanded}
            aria-controls={listId}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>

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
                  ? sortedTasks.map((task) => (
                      <TaskListItem
                        key={task.id}
                        task={task}
                        selected={task.id === selectedTaskId}
                        detail={detail?.task.id === task.id ? detail : null}
                        isDetailLoading={task.id === selectedTaskId && isDetailLoading}
                        onSelect={() => void handleSelectTask(task)}
                      />
                    ))
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
  selected: boolean;
  detail: ReturnType<typeof useTasks>['detail'];
  isDetailLoading: boolean;
  onSelect: () => void;
};

const TaskListItem = ({ task, selected, detail, isDetailLoading, onSelect }: TaskListItemProps) => {
  const StatusIcon = STATUS_ICONS[task.status];
  const isCompleted = task.status === 'done';
  const isInactive = task.status === 'cancelled' || task.status === 'archived';
  const isFailed = task.status === 'failed';
  const isExpanded = selected;

  return (
    <div className="rounded-lg">
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={isExpanded}
        className={cn(
          'group flex w-full items-center gap-2 rounded-lg px-0 py-2 text-left text-xs transition-colors',
          'cursor-pointer hover:bg-accent/30',
          isExpanded && 'bg-accent/30',
          'mx-2.5'
        )}
      >
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
        <span
          className={cn(
            'flex w-6 items-center justify-center text-muted-foreground opacity-0 transition-opacity',
            'group-hover:opacity-100',
            isExpanded && 'opacity-100'
          )}
        >
          {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="mx-2.5 py-1">
            <TaskDetailInline detail={detail} isLoading={isDetailLoading} />
          </div>
        </div>
      </div>
    </div>
  );
};

type TaskDetailInlineProps = {
  detail: ReturnType<typeof useTasks>['detail'];
  isLoading: boolean;
};

const TaskDetailInline = ({ detail, isLoading }: TaskDetailInlineProps) => {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [detail?.task.id]);

  if (isLoading) {
    return <div className="text-[10px] text-muted-foreground">{tCommon('loading')}</div>;
  }
  if (!detail) {
    return null;
  }

  const description = detail.task.description?.trim();
  if (!description) {
    return null;
  }

  const shouldClamp = description.length > 120;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1.5 text-xs text-foreground">
      <div style={isDescriptionExpanded || !shouldClamp ? undefined : DESCRIPTION_CLAMP_STYLES}>
        {description}
      </div>
      {shouldClamp ? (
        <button
          type="button"
          onClick={() => setIsDescriptionExpanded((prev) => !prev)}
          className="mt-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {isDescriptionExpanded ? t('taskPanelShowLess') : t('taskPanelShowMore')}
        </button>
      ) : null}
    </div>
  );
};
