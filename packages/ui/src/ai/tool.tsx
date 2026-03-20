/**
 * [PROPS]: Tool* - 工具调用展示组件
 * [POS]: 聊天消息中工具输出的统一 Bash Card UI（两行 Header + 固定输出滚动区 + 右下状态）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import type { ComponentProps, ReactNode } from 'react';
import { isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import type { ToolUIPart } from 'ai';
import { Check, ChevronDown, Copy, Loader } from 'lucide-react';

import { Button } from '../components/button';
import { Collapsible, CollapsibleTrigger } from '../components/collapsible';
import { AnimatedCollapse } from '../animate/primitives/base/animated-collapse';
import { ScrollArea, ScrollBar } from '../components/scroll-area';
import { cn } from '../lib/utils';
import { useConversationViewportController } from './conversation-viewport';
import { Shimmer } from './shimmer';

export type ToolProps = ComponentProps<typeof Collapsible>;
export type ToolSummaryProps = ComponentProps<typeof CollapsibleTrigger> & {
  summary: string;
  isStreaming?: boolean;
  viewportAnchorId?: string;
};

export type ToolState =
  | ToolUIPart['state']
  | 'output-interrupted'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-denied';

export type ToolStatusLabels = Partial<Record<ToolState, string>>;

// 为保持外部调用兼容保留该类型，当前 UI 不再消费状态 icon。
export type ToolStatusIcons = Partial<Record<ToolState, ReactNode>>;

export type ToolHeaderProps = {
  title?: string;
  type: string;
  state: ToolState;
  input?: Record<string, unknown>;
  className?: string;
  statusLabels?: ToolStatusLabels;
  statusIcons?: ToolStatusIcons;
  scriptType?: string;
  command?: string;
};

export type ToolContentProps = {
  open: boolean;
  state?: ToolState;
  statusLabels?: ToolStatusLabels;
  statusClassName?: string;
  className?: string;
  children?: ReactNode;
};

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

const DEFAULT_STATUS_LABELS: Record<ToolState, string> = {
  'input-streaming': 'Running',
  'input-available': 'Running',
  'approval-requested': 'Running',
  'approval-responded': 'Running',
  'output-available': 'Success',
  'output-interrupted': 'Interrupted',
  'output-error': 'Error',
  'output-denied': 'Skipped',
};

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible className={cn('not-prose w-full min-w-0', className)} {...props} />
);

export const ToolSummary = ({
  className,
  summary,
  isStreaming = false,
  viewportAnchorId,
  onClick,
  ...props
}: ToolSummaryProps) => {
  const { preserveAnchor } = useConversationViewportController();

  return (
    <CollapsibleTrigger
      data-ai-anchor={viewportAnchorId}
      className={cn(
        'group inline-flex max-w-full items-center gap-1 py-0 text-left text-sm text-muted-foreground transition-colors duration-fast hover:text-foreground',
        className
      )}
      onClick={(event) => {
        if (viewportAnchorId) {
          preserveAnchor(viewportAnchorId);
        }
        onClick?.(event);
      }}
      {...props}
    >
      <span className="min-w-0 flex-1 truncate">
        {isStreaming ? (
          <Shimmer as="span" className="truncate" duration={2}>
            {summary}
          </Shimmer>
        ) : (
          summary
        )}
      </span>
      <ChevronDown
        className={cn(
          'size-3.5 shrink-0 transition-transform duration-fast',
          'group-data-[state=closed]:-rotate-90 group-data-[state=open]:rotate-0'
        )}
      />
    </CollapsibleTrigger>
  );
};

const getFallbackScriptType = (type: string) => {
  const raw = type.startsWith('tool-') ? type.slice(5) : type;
  return raw
    .replace(/[_-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => `${chunk[0]?.toUpperCase() ?? ''}${chunk.slice(1)}`)
    .join(' ');
};

const getFallbackCommand = (type: string, input?: Record<string, unknown>) => {
  if (input && typeof input.command === 'string' && input.command.trim().length > 0) {
    return `$ ${input.command.trim()}`;
  }
  if (input && typeof input.summary === 'string' && input.summary.trim().length > 0) {
    return `$ ${input.summary.trim()}`;
  }
  const rawType = type.startsWith('tool-') ? type.slice(5) : type;
  return `$ run ${rawType}`;
};

const getStatusLabel = (state: ToolState, labels?: ToolStatusLabels) => {
  return labels?.[state] ?? DEFAULT_STATUS_LABELS[state];
};

export const ToolHeader = ({
  className,
  title: _title,
  type,
  state: _state,
  input,
  statusLabels: _statusLabels,
  statusIcons: _statusIcons,
  scriptType,
  command,
  ...props
}: ToolHeaderProps) => {
  const resolvedScriptType = scriptType ?? getFallbackScriptType(type);
  const resolvedCommand = command ?? getFallbackCommand(type, input);

  return (
    <div
      className={cn(
        'flex w-full items-start gap-2 px-3 pt-3 pb-2 text-left text-sm text-foreground',
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-muted-foreground">{resolvedScriptType}</p>
        <p className="mt-1 truncate font-mono text-[13px] text-foreground">{resolvedCommand}</p>
      </div>
    </div>
  );
};

export const ToolContent = ({
  open,
  className,
  state,
  statusLabels,
  statusClassName,
  children,
}: ToolContentProps) => {
  const statusLabel = state ? getStatusLabel(state, statusLabels) : null;

  return (
    <AnimatedCollapse open={open}>
      <div
        className={cn(
          'relative mt-2 max-w-full overflow-hidden rounded-xl border border-border-muted/70 bg-muted/35 text-foreground',
          'min-w-0',
          className
        )}
      >
        {children}
        {statusLabel ? (
          <span
            className={cn(
              'pointer-events-none absolute right-3 bottom-2 rounded-full border border-border-muted/70 bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground backdrop-blur-sm',
              statusClassName
            )}
          >
            {statusLabel}
          </span>
        ) : null}
      </div>
    </AnimatedCollapse>
  );
};

export const ToolInput = ({ className, input, label, ...props }: ToolInputProps) => (
  <div className={cn('space-y-2', className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      {label ?? 'Parameters'}
    </h4>
    <div className="rounded-lg border border-border-muted/60 bg-background/70 p-3">
      <pre className="whitespace-pre-wrap break-all font-mono text-xs text-foreground">
        {JSON.stringify(input, null, 2)}
      </pre>
    </div>
  </div>
);

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

type CommandResult = {
  command?: string;
  args?: string[];
  cwd?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  durationMs?: number;
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

type StreamingPreviewResult = {
  kind: 'streaming_preview';
  presentation: 'shell' | 'status';
  status: 'running' | 'interrupted';
  summary?: string;
  command?: string;
  cwd?: string;
  stdoutPreview?: string;
  stderrPreview?: string;
  elapsedMs: number;
  bytes: {
    stdout: number;
    stderr: number;
  };
  truncated: boolean;
};

type OutputView = {
  text: string;
  footer?: ReactNode;
};

const isTruncatedOutput = (value: unknown): value is TruncatedOutputResult => {
  if (!value || typeof value !== 'object' || isValidElement(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.kind === 'truncated_output' && typeof record.preview === 'string';
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

const isDiffResult = (value: unknown): value is ToolDiffResult => {
  if (!value || typeof value !== 'object' || isValidElement(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.patch === 'string' || typeof record.preview === 'string';
};

const isTodoResult = (value: unknown): value is PlanResult => {
  if (!value || typeof value !== 'object' || isValidElement(value)) {
    return false;
  }
  return Array.isArray((value as Record<string, unknown>).tasks);
};

const isStreamingPreviewResult = (value: unknown): value is StreamingPreviewResult => {
  if (!value || typeof value !== 'object' || isValidElement(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.kind === 'streaming_preview' && typeof record.elapsedMs === 'number';
};

const toJsonText = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const resolveOutputView = (
  output: ToolUIPart['output'],
  labels: Required<ToolOutputLabels>,
  options: {
    onApplyDiff?: (result: ToolDiffResult) => void | Promise<void>;
    onApplyDiffSuccess?: (result: ToolDiffResult) => void;
    onApplyDiffError?: (error: unknown) => void;
  }
): OutputView => {
  if (isStreamingPreviewResult(output)) {
    const sections: string[] = [];
    sections.push(
      output.summary ??
        (output.status === 'interrupted' ? 'Tool execution interrupted.' : 'Tool is running.')
    );
    if (output.cwd) {
      sections.push('', `${labels.cwd}: ${output.cwd}`);
    }
    if (output.stdoutPreview) {
      sections.push('', `${labels.stdout}:`, output.stdoutPreview);
    }
    if (output.stderrPreview) {
      sections.push('', `${labels.stderr}:`, output.stderrPreview);
    }
    sections.push('', `${labels.duration}: ${output.elapsedMs}ms`);
    if (output.truncated) {
      sections.push('', labels.outputTruncated);
    }

    return { text: sections.join('\n').trim() };
  }

  if (isTruncatedOutput(output)) {
    const lines = [
      `${labels.outputTruncated}`,
      '',
      output.preview,
      '',
      `${labels.fullOutputPath}: ${output.fullPath}`,
    ];
    if (output.hint) {
      lines.push('', output.hint);
    }
    return { text: lines.join('\n') };
  }

  if (isCommandResult(output)) {
    const sections: string[] = [];
    if (output.cwd) {
      sections.push(`${labels.cwd}: ${output.cwd}`);
    }
    if (typeof output.exitCode === 'number') {
      sections.push(`${labels.exit}: ${output.exitCode}`);
    }
    if (typeof output.durationMs === 'number') {
      sections.push(`${labels.duration}: ${output.durationMs}ms`);
    }
    if (output.stdout) {
      sections.push('', `${labels.stdout}:`, output.stdout);
    }
    if (output.stderr) {
      sections.push('', `${labels.stderr}:`, output.stderr);
    }

    return { text: sections.join('\n') };
  }

  if (isDiffResult(output)) {
    const sections: string[] = [];
    if (output.path) {
      sections.push(`${labels.targetFile}: ${output.path}`);
    }
    if (output.rationale) {
      sections.push('', output.rationale);
    }
    if (output.patch) {
      sections.push('', output.patch);
    }
    if (output.preview) {
      sections.push('', output.preview);
    }
    if (output.truncated) {
      sections.push('', labels.contentTooLong);
    }

    return {
      text: sections.join('\n').trim(),
      footer: (
        <DiffApplyAction
          result={output}
          labels={labels}
          onApplyDiff={options.onApplyDiff}
          onApplyDiffError={options.onApplyDiffError}
          onApplyDiffSuccess={options.onApplyDiffSuccess}
        />
      ),
    };
  }

  if (isTodoResult(output)) {
    const tasks = output.tasks ?? [];
    if (tasks.length === 0) {
      return { text: labels.noTasks };
    }

    const completed = output.completed ?? 0;
    const total = output.total ?? tasks.length;
    const lines = [labels.tasksCompleted(completed, total), ''];
    for (const task of tasks) {
      if (!task || typeof task !== 'object') {
        continue;
      }
      const marker =
        task.status === 'completed' ? '[x]' : task.status === 'in_progress' ? '[~]' : '[ ]';
      lines.push(`${marker} ${task.title}`);
    }
    return { text: lines.join('\n') };
  }

  return { text: toJsonText(output) };
};

const OutputCopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = null;
      }
    };
  }, []);

  const handleCopy = async () => {
    if (typeof window === 'undefined' || !navigator?.clipboard?.writeText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copiedTimerRef.current !== null) {
        clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 1500);
    } catch {
      // ignore clipboard failure
    }
  };

  return (
    <Button
      aria-label="Copy output"
      className="absolute top-1.5 right-1.5 h-7 w-7 border border-border-muted/70 bg-background/80 p-0 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
      size="icon"
      type="button"
      variant="ghost"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  );
};

const DiffApplyAction = ({
  result,
  labels,
  onApplyDiff,
  onApplyDiffSuccess,
  onApplyDiffError,
}: {
  result: ToolDiffResult;
  labels: Required<ToolOutputLabels>;
  onApplyDiff?: (result: ToolDiffResult) => void | Promise<void>;
  onApplyDiffSuccess?: (result: ToolDiffResult) => void;
  onApplyDiffError?: (error: unknown) => void;
}) => {
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

  if (!canApply) {
    return null;
  }

  return (
    <Button
      className="gap-2"
      disabled={applying || finished}
      onClick={handleApply}
      size="sm"
      type="button"
    >
      {applying ? <Loader className="size-4 animate-spin" /> : null}
      {finished ? labels.applied : applying ? labels.applying : labels.applyToFile}
    </Button>
  );
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  labels,
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

  const resolved =
    typeof errorText === 'string' && errorText.length > 0
      ? { text: errorText }
      : resolveOutputView(output, mergedLabels, {
          onApplyDiff,
          onApplyDiffError,
          onApplyDiffSuccess,
        });

  return (
    <div className={cn('min-w-0 space-y-1.5 pb-3', className)} {...props}>
      <div className="relative overflow-hidden">
        <ScrollArea
          className="max-h-[168px] [&>[data-slot=scroll-area-viewport]]:h-auto [&>[data-slot=scroll-area-viewport]]:max-h-[168px] [&>[data-slot=scroll-area-viewport]>div]:!w-max [&>[data-slot=scroll-area-viewport]>div]:min-w-full"
          data-testid="tool-output-scroll"
        >
          <pre className="w-max min-w-full whitespace-pre p-3 pr-11 font-mono text-xs text-foreground">
            {resolved.text}
          </pre>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <OutputCopyButton text={resolved.text} />
      </div>

      {resolved.footer ? <div className="flex justify-end px-3">{resolved.footer}</div> : null}
    </div>
  );
};
