/**
 * [PROPS]: { open, onOpenChange, activeSessionId } - Tasks 面板开关与会话上下文
 * [EMITS]: onOpenChange(open)
 * [POS]: ChatPane Tasks 面板（列表 + 详情）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo, type ReactNode } from 'react';
import { Button } from '@anyhunt/ui/components/button';
import { Badge } from '@anyhunt/ui/components/badge';
import { ScrollArea } from '@anyhunt/ui/components/scroll-area';
import { Separator } from '@anyhunt/ui/components/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@anyhunt/ui/components/sheet';
import { cn } from '@/lib/utils';
import type { TaskRecord, TaskStatus, TaskDetailResult } from '@shared/ipc';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@anyhunt/agents-tools';
import { useTasks } from '../hooks';

type TasksPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSessionId: string | null;
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

const STATUS_VARIANTS: Record<TaskStatus, BadgeVariant> = {
  todo: 'secondary',
  in_progress: 'default',
  blocked: 'warning',
  done: 'success',
  failed: 'destructive',
  cancelled: 'outline',
  archived: 'outline',
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export const TasksPanel = ({ open, onOpenChange, activeSessionId }: TasksPanelProps) => {
  const { tasks, detail, selectedTaskId, isLoading, isDetailLoading, error, refresh, selectTask } =
    useTasks({ activeSessionId, enabled: open });

  const taskMap = useMemo(() => {
    return new Map(tasks.map((task) => [task.id, task]));
  }, [tasks]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[420px] flex-col gap-4">
        <SheetHeader className="flex flex-row items-center justify-between gap-2">
          <SheetTitle>Tasks</SheetTitle>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isLoading}>
            Refresh
          </Button>
        </SheetHeader>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Task list</span>
              <span>{tasks.length} items</span>
            </div>
            <ScrollArea className="h-full min-h-[180px] rounded-md border border-border/60">
              <div className="flex flex-col gap-1 p-2">
                {tasks.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    {isLoading ? 'Loading tasks…' : 'No tasks yet.'}
                  </div>
                ) : (
                  tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      selected={task.id === selectedTaskId}
                      onSelect={() => void selectTask(task.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          <TaskDetail detail={detail} taskMap={taskMap} isLoading={isDetailLoading} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

type TaskRowProps = {
  task: TaskRecord;
  selected: boolean;
  onSelect: () => void;
};

const TaskRow = ({ task, selected, onSelect }: TaskRowProps) => {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-start justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors',
        selected ? 'bg-accent' : 'hover:bg-accent/60'
      )}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{task.title}</div>
        <div className="text-xs text-muted-foreground">
          Updated {formatTimestamp(task.updatedAt)}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant={STATUS_VARIANTS[task.status]} className="text-[10px]">
          {TASK_STATUS_LABELS[task.status]}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {TASK_PRIORITY_LABELS[task.priority]}
        </Badge>
      </div>
    </button>
  );
};

type TaskDetailProps = {
  detail: TaskDetailResult | null;
  taskMap: Map<string, TaskRecord>;
  isLoading: boolean;
};

const TaskDetail = ({ detail, taskMap, isLoading }: TaskDetailProps) => {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading details…</div>;
  }
  if (!detail) {
    return <div className="text-sm text-muted-foreground">Select a task to view details.</div>;
  }

  const { task, dependencies, notes, files } = detail;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-foreground">{task.title}</div>
        <Badge variant={STATUS_VARIANTS[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Priority: {TASK_PRIORITY_LABELS[task.priority]}</span>
        <span>Owner: {task.owner || 'Unassigned'}</span>
        <span>Updated: {formatTimestamp(task.updatedAt)}</span>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm text-foreground">
        {task.description ? task.description : 'No description.'}
      </div>

      <DetailSection title="Dependencies">
        {dependencies.length === 0 ? (
          <div className="text-xs text-muted-foreground">No dependencies.</div>
        ) : (
          <ul className="flex flex-col gap-1 text-xs">
            {dependencies.map((dep) => {
              const target = taskMap.get(dep.dependsOn);
              return (
                <li key={dep.dependsOn} className="text-foreground">
                  {target?.title ?? dep.dependsOn}
                </li>
              );
            })}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="Notes">
        {notes.length === 0 ? (
          <div className="text-xs text-muted-foreground">No notes.</div>
        ) : (
          <ul className="flex flex-col gap-2 text-xs">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-md border border-border/60 bg-background px-2 py-2"
              >
                <div className="text-foreground">{note.body}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {note.author} · {formatTimestamp(note.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title="Files">
        {files.length === 0 ? (
          <div className="text-xs text-muted-foreground">No files.</div>
        ) : (
          <ul className="flex flex-col gap-1 text-xs">
            {files.map((file) => (
              <li key={`${file.path}-${file.role}`} className="text-foreground">
                {file.path} <span className="text-muted-foreground">({file.role})</span>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>
    </div>
  );
};

type DetailSectionProps = {
  title: string;
  children: ReactNode;
};

const DetailSection = ({ title, children }: DetailSectionProps) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
};
