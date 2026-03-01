/**
 * [PROPS]: MessageToolProps - ToolUIPart/DynamicToolUIPart 渲染参数
 * [EMITS]: None
 * [POS]: AgentMessageList 的 Tool 消息渲染
 * [UPDATE]: 2026-03-02 - 对齐 Moryflow Tool 交互：运行态默认展开、完成后自动折叠，移除 Parameters 输入区
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useRef, useState } from 'react';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
  type ToolOutputLabels,
  type ToolState,
  type ToolStatusLabels,
} from '@moryflow/ui/ai/tool';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';

const TOOL_STATUS_LABELS: ToolStatusLabels = {
  'input-streaming': 'Preparing',
  'input-available': 'Running',
  'approval-requested': 'Awaiting approval',
  'approval-responded': 'Approved',
  'output-available': 'Completed',
  'output-error': 'Error',
  'output-denied': 'Skipped',
};

const TOOL_OUTPUT_LABELS: ToolOutputLabels = {
  result: 'Result',
  error: 'Error',
  command: 'Command',
  cwd: 'cwd',
  exit: 'Exit',
  duration: 'Duration',
  stdout: 'stdout',
  stderr: 'stderr',
  targetFile: 'Target file',
  contentTooLong: 'Content too long',
  applyToFile: 'Apply to file',
  applying: 'Applying...',
  applied: 'Applied',
  noTasks: 'No tasks available',
  tasksCompleted: (completed: number, total: number) => `Tasks completed: ${completed}/${total}`,
};

const TOOL_IN_PROGRESS_STATES = new Set([
  'input-streaming',
  'input-available',
  'approval-requested',
  'approval-responded',
]);

const TOOL_FINISHED_STATES = new Set(['output-available', 'output-error', 'output-denied']);

const isToolInProgressState = (state: string | null | undefined): boolean =>
  typeof state === 'string' && TOOL_IN_PROGRESS_STATES.has(state);

const shouldAutoCollapse = (
  previousState: string | null | undefined,
  nextState: string | null | undefined
): boolean =>
  typeof previousState === 'string' &&
  TOOL_IN_PROGRESS_STATES.has(previousState) &&
  typeof nextState === 'string' &&
  TOOL_FINISHED_STATES.has(nextState);

type MessageToolProps = {
  part: ToolUIPart | DynamicToolUIPart;
};

export function MessageTool({ part }: MessageToolProps) {
  const toolType = part.type === 'dynamic-tool' ? `tool-${part.toolName}` : part.type;
  const hasOutput = part.output !== undefined || !!part.errorText;
  const toolState = part.state as ToolState;
  const [isOpen, setIsOpen] = useState(() => isToolInProgressState(toolState));
  const hasManualExpanded = useRef(false);
  const previousState = useRef<string | undefined>(toolState);

  useEffect(() => {
    if (isToolInProgressState(toolState)) {
      setIsOpen(true);
    } else if (shouldAutoCollapse(previousState.current, toolState) && !hasManualExpanded.current) {
      setIsOpen(false);
    }
    previousState.current = toolState;
  }, [toolState]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      hasManualExpanded.current = true;
    }
    setIsOpen(nextOpen);
  };

  return (
    <Tool
      className="mb-3 w-full border-0 bg-transparent p-0"
      open={isOpen}
      onOpenChange={handleOpenChange}
      disabled={!hasOutput}
    >
      <ToolHeader
        type={toolType}
        state={toolState}
        input={part.input as Record<string, unknown> | undefined}
        statusLabels={TOOL_STATUS_LABELS}
        className="px-0 py-0.5"
      />
      {hasOutput ? (
        <ToolContent className="pt-2">
          <ToolOutput output={part.output} errorText={part.errorText} labels={TOOL_OUTPUT_LABELS} />
        </ToolContent>
      ) : null}
    </Tool>
  );
}
