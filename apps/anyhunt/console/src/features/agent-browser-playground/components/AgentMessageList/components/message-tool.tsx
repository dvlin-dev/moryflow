/**
 * [PROPS]: MessageToolProps - ToolUIPart/DynamicToolUIPart 渲染参数
 * [EMITS]: None
 * [POS]: AgentMessageList 的 Tool 消息渲染
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
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

type MessageToolProps = {
  part: ToolUIPart | DynamicToolUIPart;
};

export function MessageTool({ part }: MessageToolProps) {
  const toolType = part.type === 'dynamic-tool' ? `tool-${part.toolName}` : part.type;
  const hasInput = part.input !== undefined;
  const hasOutput = part.output !== undefined || !!part.errorText;
  const hasDetails = hasInput || hasOutput;

  return (
    <Tool defaultOpen={false} disabled={!hasDetails}>
      <ToolHeader
        type={toolType}
        state={part.state as ToolState}
        input={part.input as Record<string, unknown> | undefined}
        statusLabels={TOOL_STATUS_LABELS}
      />
      {hasDetails ? (
        <ToolContent>
          {hasInput ? <ToolInput input={part.input} label="Parameters" /> : null}
          {hasOutput ? (
            <ToolOutput
              output={part.output}
              errorText={part.errorText}
              labels={TOOL_OUTPUT_LABELS}
            />
          ) : null}
        </ToolContent>
      ) : null}
    </Tool>
  );
}
