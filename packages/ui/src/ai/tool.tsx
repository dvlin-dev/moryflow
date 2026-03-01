/**
 * [PROPS]: Tool* - 工具调用展示组件
 * [POS]: 聊天消息中工具输入/输出的通用 UI（含状态、结果与截断预览，Lucide 直渲染）
 * [UPDATE]: 2026-03-02 - Tool 头部与容器样式收敛为消息流同层表达（去容器化）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import type { ComponentProps, ReactNode } from 'react';
import { isValidElement, useMemo, useState } from 'react';
import type { ToolUIPart } from 'ai';
import { ChevronDown, X, Clock, Terminal, FileText, Loader, Circle, Check } from 'lucide-react';

import { Button } from '../components/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/collapsible';
import { ScrollArea, ScrollBar } from '../components/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/tooltip';
import { cn } from '../lib/utils';
import { CodeBlock } from './code-block';

export type ToolProps = ComponentProps<typeof Collapsible>;

export type ToolState =
  | ToolUIPart['state']
  | 'approval-requested'
  | 'approval-responded'
  | 'output-denied';

export type ToolStatusLabels = Partial<Record<ToolState, string>>;

export type ToolStatusIcons = Partial<Record<ToolState, ReactNode>>;

export type ToolHeaderProps = {
  title?: string;
  type: string;
  state: ToolState;
  input?: Record<string, unknown>;
  className?: string;
  statusLabels?: ToolStatusLabels;
  statusIcons?: ToolStatusIcons;
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolUIPart['input'];
  label?: string;
};

export type ToolOutputLabels = {
  result?: string;
  error?: string;
  command?: string;
  cwd?: string;
  exit?: string;
  duration?: string;
  stdout?: string;
  stderr?: string;
  targetFile?: string;
  contentTooLong?: string;
  outputTruncated?: string;
  viewFullOutput?: string;
  fullOutputPath?: string;
  applyToFile?: string;
  applying?: string;
  applied?: string;
  noTasks?: string;
  tasksCompleted?: (completed: number, total: number) => string;
};

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ToolUIPart['output'];
  errorText: ToolUIPart['errorText'];
  labels?: ToolOutputLabels;
  onOpenFullOutput?: (fullPath: string) => void | Promise<void>;
  onApplyDiff?: (result: ToolDiffResult) => void | Promise<void>;
  onApplyDiffSuccess?: (result: ToolDiffResult) => void;
  onApplyDiffError?: (error: unknown) => void;
};

export type ToolDiffResult = {
  patch?: string;
  preview?: string;
  truncated?: boolean;
  rationale?: string;
  path?: string;
  baseSha?: string;
  mode?: 'patch' | 'replace';
  content?: string;
};

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible className={cn('not-prose mb-3 w-full', 'min-w-0', className)} {...props} />
);

const DEFAULT_STATUS_LABELS: Record<ToolState, string> = {
  'input-streaming': 'Preparing',
  'input-available': 'Running',
  'approval-requested': 'Awaiting approval',
  'approval-responded': 'Approved',
  'output-available': 'Completed',
  'output-error': 'Error',
  'output-denied': 'Skipped',
};

const DEFAULT_STATUS_ICONS: Record<ToolState, ReactNode> = {
  'input-streaming': <Circle className="size-3.5 text-muted-foreground" />,
  'input-available': <Loader className="size-3.5 animate-spin text-muted-foreground" />,
  'approval-requested': <Clock className="size-3.5 text-muted-foreground" />,
  'approval-responded': <Check className="size-3.5 text-muted-foreground" />,
  'output-available': <Check className="size-3.5 text-muted-foreground" />,
  'output-error': <X className="size-3.5 text-destructive" />,
  'output-denied': <X className="size-3.5 text-muted-foreground" />,
};

/**
 * 从工具输入中提取 summary，如果没有则返回格式化的工具名
 */
const getToolDisplayName = (
  type: string,
  input?: Record<string, unknown>,
  title?: string
): string => {
  if (title) return title;
  if (input && typeof input.summary === 'string' && input.summary.trim()) {
    return input.summary.trim();
  }
  return type.split('-').slice(1).join('-') || type;
};

const getStatusBadge = (status: ToolState, labels?: ToolStatusLabels, icons?: ToolStatusIcons) => {
  const label = labels?.[status] ?? DEFAULT_STATUS_LABELS[status];
  const icon = icons?.[status] ?? DEFAULT_STATUS_ICONS[status];

  if (!label) {
    return <span className="inline-flex">{icon}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default">{icon}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  input,
  statusLabels,
  statusIcons,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      'group flex w-full items-center gap-2 py-0.5 text-left text-sm text-muted-foreground transition-colors duration-fast hover:text-foreground',
      className
    )}
    {...props}
  >
    {getStatusBadge(state, statusLabels, statusIcons)}
    <span className="min-w-0 truncate font-medium text-foreground">
      {getToolDisplayName(type, input, title)}
    </span>
    <ChevronDown
      className={cn(
        'size-4 shrink-0 text-muted-foreground transition-transform duration-fast',
        'group-data-[state=open]:rotate-180'
      )}
    />
  </CollapsibleTrigger>
);

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'max-w-full overflow-hidden data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-foreground outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in',
      'min-w-0',
      className
    )}
    {...props}
  />
);

export const ToolInput = ({ className, input, label, ...props }: ToolInputProps) => (
  <div className={cn('space-y-2 p-4', className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      {label ?? 'Parameters'}
    </h4>
    <ScrollArea className="rounded-lg bg-muted/50">
      <div className="min-w-0">
        <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  </div>
);

export const ToolOutput = ({
  className,
  output,
  errorText,
  labels,
  onOpenFullOutput,
  onApplyDiff,
  onApplyDiffError,
  onApplyDiffSuccess,
  ...props
}: ToolOutputProps) => {
  const mergedLabels = useMemo<Required<ToolOutputLabels>>(
    () => ({
      result: labels?.result ?? 'Result',
      error: labels?.error ?? 'Error',
      command: labels?.command ?? 'Command',
      cwd: labels?.cwd ?? 'cwd',
      exit: labels?.exit ?? 'Exit',
      duration: labels?.duration ?? 'Duration',
      stdout: labels?.stdout ?? 'stdout',
      stderr: labels?.stderr ?? 'stderr',
      targetFile: labels?.targetFile ?? 'Target file',
      contentTooLong: labels?.contentTooLong ?? 'Content too long',
      outputTruncated: labels?.outputTruncated ?? 'Output truncated',
      viewFullOutput: labels?.viewFullOutput ?? 'View full output',
      fullOutputPath: labels?.fullOutputPath ?? 'Full output path',
      applyToFile: labels?.applyToFile ?? 'Apply to file',
      applying: labels?.applying ?? 'Applying...',
      applied: labels?.applied ?? 'Applied',
      noTasks: labels?.noTasks ?? 'No tasks available',
      tasksCompleted:
        labels?.tasksCompleted ??
        ((completed: number, total: number) => `Tasks completed: ${completed}/${total}`),
    }),
    [labels]
  );

  if (output == null && !errorText) {
    return null;
  }

  const specialized = getSpecializedOutput(output, mergedLabels, {
    onApplyDiff,
    onApplyDiffError,
    onApplyDiffSuccess,
    onOpenFullOutput,
  });

  let content: ReactNode = specialized;

  if (errorText) {
    content = (
      <ScrollArea className="rounded-lg bg-destructive/10 text-destructive">
        <div className="p-2 text-xs">{errorText}</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  } else if (specialized) {
    content = (
      <ScrollArea className="rounded-lg border border-border-muted/60 bg-muted/30">
        <div className="p-2">{specialized}</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  } else {
    let Output = <div>{output as ReactNode}</div>;
    if (typeof output === 'object' && !isValidElement(output)) {
      Output = <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />;
    } else if (typeof output === 'string') {
      Output = <CodeBlock code={output} language="json" />;
    }
    content = (
      <ScrollArea className="rounded-lg bg-muted/50 text-xs text-foreground [&_table]:w-full">
        <div className="p-2">{Output}</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  }

  return (
    <div className={cn('space-y-2 p-4 min-w-0', className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? mergedLabels.error : mergedLabels.result}
      </h4>
      {content}
    </div>
  );
};

type SpecializedOptions = {
  onApplyDiff?: (result: ToolDiffResult) => void | Promise<void>;
  onApplyDiffSuccess?: (result: ToolDiffResult) => void;
  onApplyDiffError?: (error: unknown) => void;
  onOpenFullOutput?: (fullPath: string) => void | Promise<void>;
};

const getSpecializedOutput = (
  output: ToolUIPart['output'],
  labels: Required<ToolOutputLabels>,
  options: SpecializedOptions
): ReactNode => {
  if (!output || isValidElement(output)) {
    return null;
  }
  if (isTruncatedOutput(output)) {
    return (
      <TruncatedOutput
        result={output}
        labels={labels}
        onOpenFullOutput={options.onOpenFullOutput}
      />
    );
  }
  if (isCommandResult(output)) {
    return <CommandOutput result={output} labels={labels} />;
  }
  if (isDiffResult(output)) {
    return <DiffOutput result={output} labels={labels} {...options} />;
  }
  if (isTodoResult(output)) {
    return <TodoOutput result={output} labels={labels} />;
  }
  return null;
};

type TruncatedOutputResult = {
  kind: 'truncated_output';
  truncated: true;
  preview: string;
  fullPath: string;
  hint?: string;
  metadata?: {
    lines?: number;
    bytes?: number;
    maxLines?: number;
    maxBytes?: number;
  };
};

const isTruncatedOutput = (value: unknown): value is TruncatedOutputResult => {
  if (!value || typeof value !== 'object' || isValidElement(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.kind === 'truncated_output' && typeof record.preview === 'string';
};

const TruncatedOutput = ({
  result,
  labels,
  onOpenFullOutput,
}: {
  result: TruncatedOutputResult;
  labels: Required<ToolOutputLabels>;
  onOpenFullOutput?: (fullPath: string) => void | Promise<void>;
}) => {
  const hasPath = typeof result.fullPath === 'string' && result.fullPath.length > 0;
  const handleOpen = () => {
    if (!hasPath || !onOpenFullOutput) return;
    void Promise.resolve(onOpenFullOutput(result.fullPath)).catch((error) => {
      console.error('[tool-output] failed to open full output', error);
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border-muted/60 bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {labels.outputTruncated}
        </span>
        {hasPath && onOpenFullOutput && (
          <Button size="sm" variant="secondary" onClick={handleOpen} type="button">
            {labels.viewFullOutput}
          </Button>
        )}
      </div>
      <CodeBlock code={result.preview} language="markdown" className="text-xs" />
      {hasPath && (
        <div className="text-xs text-muted-foreground">
          {labels.fullOutputPath}: <span className="font-mono break-all">{result.fullPath}</span>
        </div>
      )}
      {result.hint && <p className="text-xs text-muted-foreground">{result.hint}</p>}
    </div>
  );
};

type CommandResult = {
  command?: string;
  args?: string[];
  cwd?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  durationMs?: number;
};

const isCommandResult = (value: unknown): value is CommandResult => {
  if (!value || typeof value !== 'object' || isValidElement(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.stdout === 'string' ||
    typeof record.stderr === 'string' ||
    typeof record.command === 'string'
  );
};

const CommandOutput = ({
  result,
  labels,
}: {
  result: CommandResult;
  labels: Required<ToolOutputLabels>;
}) => {
  const metaItems: Array<{ label: string; value: ReactNode }> = [];
  if (result.command) {
    metaItems.push({
      label: labels.command,
      value: (
        <code className="rounded-md bg-muted px-1 py-0.5 text-xs">
          {result.command} {(result.args ?? []).join(' ')}
        </code>
      ),
    });
  }
  if (result.cwd) {
    metaItems.push({ label: labels.cwd, value: result.cwd });
  }
  if (typeof result.exitCode === 'number') {
    metaItems.push({ label: labels.exit, value: result.exitCode });
  }
  if (typeof result.durationMs === 'number') {
    metaItems.push({ label: labels.duration, value: `${result.durationMs} ms` });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border-muted/60 bg-muted/30 p-3">
      {metaItems.length > 0 && (
        <dl className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {metaItems.map((item) => (
            <div className="flex items-center gap-1" key={item.label}>
              <dt className="font-medium">{item.label}:</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <CommandStream
        icon={<Terminal className="size-3.5" />}
        label={labels.stdout}
        value={result.stdout}
      />
      <CommandStream
        icon={<FileText className="size-3.5" />}
        label={labels.stderr}
        value={result.stderr}
        muted
      />
    </div>
  );
};

const CommandStream = ({
  icon,
  label,
  value,
  muted,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  muted?: boolean;
}) => {
  if (!value) {
    return null;
  }
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="font-medium uppercase tracking-wide">{label}</span>
      </div>
      <ScrollArea
        className={cn(
          'rounded-lg border border-border-muted/60 bg-background',
          muted && 'opacity-80'
        )}
      >
        <pre className="whitespace-pre-wrap p-2 font-mono text-xs">{value}</pre>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

const isDiffResult = (value: unknown): value is ToolDiffResult => {
  if (!value || typeof value !== 'object' || isValidElement(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.patch === 'string' || typeof record.preview === 'string';
};

const DiffOutput = ({
  result,
  labels,
  onApplyDiff,
  onApplyDiffError,
  onApplyDiffSuccess,
}: {
  result: ToolDiffResult;
  labels: Required<ToolOutputLabels>;
} & SpecializedOptions) => {
  const [applying, setApplying] = useState(false);
  const [finished, setFinished] = useState(false);
  const canApply =
    Boolean(onApplyDiff) &&
    Boolean(result.path && result.baseSha && (result.patch || result.content));

  const handleApply = async () => {
    if (!canApply || applying || finished || !onApplyDiff) {
      return;
    }
    try {
      setApplying(true);
      await onApplyDiff(result);
      setFinished(true);
      onApplyDiffSuccess?.(result);
    } catch (error) {
      onApplyDiffError?.(error);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border-muted/60 bg-muted/30 p-3">
      {result.path && (
        <div className="text-xs text-muted-foreground">
          {labels.targetFile}: <span className="font-mono">{result.path}</span>
        </div>
      )}
      {result.rationale && <p className="text-sm text-foreground">{result.rationale}</p>}
      {result.patch && <CodeBlock code={result.patch} language="diff" className="text-xs" />}
      {result.preview && (
        <CodeBlock code={result.preview} language="markdown" className="text-xs" />
      )}
      {result.truncated && <p className="text-xs text-muted-foreground">{labels.contentTooLong}</p>}
      {canApply && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="gap-2"
            disabled={applying || finished}
            onClick={handleApply}
            type="button"
          >
            {applying && <Loader className="size-4 animate-spin" />}
            {finished ? labels.applied : applying ? labels.applying : labels.applyToFile}
          </Button>
        </div>
      )}
    </div>
  );
};

type PlanResult = {
  chatId?: string;
  tasks?: Array<{
    title: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  total?: number;
  pending?: number;
  inProgress?: number;
  completed?: number;
  allCompleted?: boolean;
  hint?: string;
};

const isTodoResult = (value: unknown): value is PlanResult => {
  if (!value || typeof value !== 'object' || isValidElement(value)) {
    return false;
  }
  return Array.isArray((value as Record<string, unknown>).tasks);
};

const TodoOutput = ({
  result,
  labels,
}: {
  result: PlanResult;
  labels: Required<ToolOutputLabels>;
}) => {
  const tasks = result?.tasks ?? [];
  const completed = result?.completed ?? 0;
  const total = result?.total ?? tasks.length;

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-border-muted/60 bg-muted/30 px-3 py-2">
        <p className="text-xs text-muted-foreground">{labels.noTasks}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-muted/60 bg-muted/30 px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{labels.tasksCompleted(completed, total)}</div>
      <div className="mt-2 space-y-1">
        {tasks.map((task, index) => {
          if (!task || typeof task !== 'object') return null;
          const title = task.title ?? '';
          const status = task.status ?? 'pending';
          const isCompleted = status === 'completed';
          const isInProgress = status === 'in_progress';
          return (
            <div key={`${title}-${index}`} className="flex items-center gap-2 text-sm">
              {isCompleted ? (
                <Check className="size-4 shrink-0 text-emerald-500" />
              ) : isInProgress ? (
                <Loader className="size-4 shrink-0 animate-spin text-blue-500" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground/50" />
              )}
              <span className={cn('truncate', isCompleted && 'text-muted-foreground line-through')}>
                {title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
