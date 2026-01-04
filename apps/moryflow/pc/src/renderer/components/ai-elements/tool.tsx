'use client'

import { Button } from '@aiget/ui/components/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@aiget/ui/components/collapsible'
import { ScrollArea, ScrollBar } from '@aiget/ui/components/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@aiget/ui/components/tooltip'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { ToolUIPart } from 'ai'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  FileTextIcon,
  Loader2Icon,
  TerminalIcon,
  XCircleIcon,
} from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { isValidElement, useState } from 'react'
import { toast } from 'sonner'
import { CodeBlock } from '@aiget/ui/ai/code-block'

export type ToolProps = ComponentProps<typeof Collapsible>

export type ToolState =
  | ToolUIPart['state']
  | 'approval-requested'
  | 'approval-responded'
  | 'output-denied'

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn('not-prose mb-4 w-full rounded-lg border border-border-muted', 'min-w-0', className)}
    {...props}
  />
)

export type ToolHeaderProps = {
  title?: string
  type: string
  state: ToolState
  input?: Record<string, unknown>
  className?: string
}

/**
 * 从工具输入中提取 summary，如果没有则返回格式化的工具名
 */
const getToolDisplayName = (type: string, input?: Record<string, unknown>, title?: string): string => {
  if (title) return title
  if (input && typeof input.summary === 'string' && input.summary.trim()) {
    return input.summary.trim()
  }
  // type 格式通常是 "tool-read" -> "read"
  return type.split('-').slice(1).join('-') || type
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getStatusBadge = (status: ToolState, t: any) => {
  const labelKeys: Record<ToolState, string> = {
    'input-streaming': 'statusPreparing',
    'input-available': 'statusExecuting',
    'approval-requested': 'statusWaitingConfirmation',
    'approval-responded': 'statusConfirmed',
    'output-available': 'statusCompleted',
    'output-error': 'statusError',
    'output-denied': 'statusSkipped',
  }

  const icons: Record<ToolState, ReactNode> = {
    'input-streaming': <CircleIcon className="size-3.5 text-muted-foreground" />,
    'input-available': <Loader2Icon className="size-3.5 animate-spin text-blue-500" />,
    'approval-requested': <ClockIcon className="size-3.5 text-warning" />,
    'approval-responded': <CheckCircleIcon className="size-3.5 text-blue-500" />,
    'output-available': <CheckCircleIcon className="size-3.5 text-success" />,
    'output-error': <XCircleIcon className="size-3.5 text-destructive" />,
    'output-denied': <XCircleIcon className="size-3.5 text-warning" />,
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default">{icons[status]}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {t(labelKeys[status])}
      </TooltipContent>
    </Tooltip>
  )
}

export const ToolHeader = ({ className, title, type, state, input, ...props }: ToolHeaderProps) => {
  const { t } = useTranslation('chat')
  return (
    <CollapsibleTrigger
      className={cn('flex w-full items-center justify-between gap-3 p-3', className)}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium text-sm">{getToolDisplayName(type, input, title)}</span>
        {getStatusBadge(state, t)}
      </div>
      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-fast group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  )
}

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'max-w-full overflow-hidden data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in',
      'min-w-0',
      className
    )}
    {...props}
  />
)

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolUIPart['input']
}

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => {
  const { t } = useTranslation('chat')
  return (
    <div className={cn('space-y-2 p-4', className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {t('parameters')}
      </h4>
      <ScrollArea className="rounded-lg bg-muted/50">
        <div className="min-w-0">
          <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ToolUIPart['output']
  errorText: ToolUIPart['errorText']
}

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
  const { t } = useTranslation('chat')

  if (!(output || errorText)) {
    return null
  }

  const specialized = getSpecializedOutput(output)
  let content: ReactNode = specialized

  if (errorText) {
    content = (
      <ScrollArea className="rounded-lg bg-destructive/10 text-destructive">
        <div className="p-2 text-xs">{errorText}</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    )
  } else if (specialized) {
    content = (
      <ScrollArea className="rounded-lg border border-border-muted/60 bg-muted/30">
        <div className="p-2">{specialized}</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    )
  } else {
    let Output = <div>{output as ReactNode}</div>
    if (typeof output === 'object' && !isValidElement(output)) {
      Output = <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    } else if (typeof output === 'string') {
      Output = <CodeBlock code={output} language="json" />
    }
    content = (
      <ScrollArea className="rounded-lg bg-muted/50 text-xs text-foreground [&_table]:w-full">
        <div className="p-2">{Output}</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    )
  }

  return (
    <div className={cn('space-y-2 p-4 min-w-0', className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? t('errorLabel') : t('resultLabel')}
      </h4>
      {content}
    </div>
  )
}

const getSpecializedOutput = (output: ToolUIPart['output']): ReactNode => {
  if (!output || isValidElement(output)) {
    return null
  }
  if (isCommandResult(output)) {
    return <CommandOutput result={output} />
  }
  if (isDiffResult(output)) {
    return <DiffOutput result={output} />
  }
  if (isTodoResult(output)) {
    return <TodoOutput result={output} />
  }
  return null
}

type CommandResult = {
  command?: string
  args?: string[]
  cwd?: string
  stdout?: string
  stderr?: string
  exitCode?: number | null
  durationMs?: number
}

const isCommandResult = (value: unknown): value is CommandResult => {
  if (!value || typeof value !== 'object' || isValidElement(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.stdout === 'string' ||
    typeof record.stderr === 'string' ||
    typeof record.command === 'string'
  )
}

const CommandOutput = ({ result }: { result: CommandResult }) => {
  const metaItems: Array<{ label: string; value: ReactNode }> = []
  if (result.command) {
    metaItems.push({
      label: 'Command',
      value: (
        <code className="rounded-md bg-muted px-1 py-0.5 text-xs">
          {result.command} {(result.args ?? []).join(' ')}
        </code>
      ),
    })
  }
  if (result.cwd) {
    metaItems.push({ label: 'cwd', value: result.cwd })
  }
  if (typeof result.exitCode === 'number') {
    metaItems.push({ label: 'Exit', value: result.exitCode })
  }
  if (typeof result.durationMs === 'number') {
    metaItems.push({ label: 'Duration', value: `${result.durationMs} ms` })
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
        icon={<TerminalIcon className="size-3.5" />}
        label="stdout"
        value={result.stdout}
      />
      <CommandStream
        icon={<FileTextIcon className="size-3.5" />}
        label="stderr"
        value={result.stderr}
        muted
      />
    </div>
  )
}

const CommandStream = ({
  icon,
  label,
  value,
  muted,
}: {
  icon: ReactNode
  label: string
  value?: string
  muted?: boolean
}) => {
  if (!value) {
    return null
  }
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="font-medium uppercase tracking-wide">{label}</span>
      </div>
      <ScrollArea
        className={cn('rounded-lg border border-border-muted/60 bg-background', muted && 'opacity-80')}
      >
        <pre className="whitespace-pre-wrap p-2 font-mono text-xs">{value}</pre>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

type DiffResult = {
  patch?: string
  preview?: string
  truncated?: boolean
  rationale?: string
  path?: string
  baseSha?: string
  mode?: 'patch' | 'replace'
  content?: string
}

const isDiffResult = (value: unknown): value is DiffResult => {
  if (!value || typeof value !== 'object' || isValidElement(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return typeof record.patch === 'string' || typeof record.preview === 'string'
}

const DiffOutput = ({ result }: { result: DiffResult }) => {
  const { t } = useTranslation('chat')
  const [applying, setApplying] = useState(false)
  const [finished, setFinished] = useState(false)
  const canApply =
    Boolean(window.desktopAPI?.chat?.applyEdit) &&
    Boolean(result.path && result.baseSha && (result.patch || result.content))

  const handleApply = async () => {
    if (!canApply || applying || finished) {
      return
    }
    try {
      setApplying(true)
      await window.desktopAPI!.chat!.applyEdit!({
        path: result.path!,
        baseSha: result.baseSha!,
        patch: result.patch,
        content: result.content,
        mode: result.mode ?? 'patch',
      })
      toast.success(t('fileWritten'))
      setFinished(true)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : t('writeFailed'))
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border-muted/60 bg-muted/30 p-3">
      {result.path && (
        <div className="text-xs text-muted-foreground">
          {t('targetFile')}<span className="font-mono">{result.path}</span>
        </div>
      )}
      {result.rationale && <p className="text-sm text-foreground">{result.rationale}</p>}
      {result.patch && <CodeBlock code={result.patch} language="diff" className="text-xs" />}
      {result.preview && (
        <CodeBlock code={result.preview} language="markdown" className="text-xs" />
      )}
      {result.truncated && (
        <p className="text-xs text-muted-foreground">
          {t('contentTooLong')}
        </p>
      )}
      {canApply && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="gap-2"
            disabled={applying || finished}
            onClick={handleApply}
          >
            {applying && <Loader2Icon className="size-4 animate-spin" />}
            {finished ? t('written') : t('applyToFile')}
          </Button>
        </div>
      )}
    </div>
  )
}

type PlanResult = {
  chatId?: string
  tasks?: Array<{
    title: string
    status: 'pending' | 'in_progress' | 'completed'
  }>
  total?: number
  pending?: number
  inProgress?: number
  completed?: number
  allCompleted?: boolean
  hint?: string
}

const isTodoResult = (value: unknown): value is PlanResult => {
  if (!value || typeof value !== 'object' || isValidElement(value)) {
    return false
  }
  return Array.isArray((value as Record<string, unknown>).tasks)
}

const TodoOutput = ({ result }: { result: PlanResult }) => {
  const { t } = useTranslation('chat')
  const tasks = result?.tasks ?? []
  const completed = result?.completed ?? 0
  const total = result?.total ?? tasks.length

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-border-muted/60 bg-muted/30 px-3 py-2">
        <p className="text-xs text-muted-foreground">{t('noTasks')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border-muted/60 bg-muted/30 px-3 py-2.5">
      <div className="text-xs text-muted-foreground">
        {t('tasksCompleted', { completed, total })}
      </div>
      <div className="mt-2 space-y-1">
        {tasks.map((task, index) => {
          if (!task || typeof task !== 'object') return null
          const title = task.title ?? ''
          const status = task.status ?? 'pending'
          const isCompleted = status === 'completed'
          const isInProgress = status === 'in_progress'
          return (
            <div key={`${title}-${index}`} className="flex items-center gap-2 text-sm">
              {isCompleted ? (
                <CheckCircleIcon className="size-4 shrink-0 text-emerald-500" />
              ) : isInProgress ? (
                <Loader2Icon className="size-4 shrink-0 animate-spin text-blue-500" />
              ) : (
                <CircleIcon className="size-4 shrink-0 text-muted-foreground/50" />
              )}
              <span className={cn('truncate', isCompleted && 'text-muted-foreground line-through')}>
                {title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
