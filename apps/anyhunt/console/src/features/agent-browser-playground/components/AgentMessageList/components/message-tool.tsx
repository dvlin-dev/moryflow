/**
 * [PROPS]: MessageToolProps - ToolUIPart/DynamicToolUIPart 渲染参数
 * [EMITS]: None
 * [POS]: AgentMessageList 的 Tool 消息渲染
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useState } from 'react';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
  ToolSummary,
  type ToolState,
} from '@moryflow/ui/ai/tool';
import { resolveToolOpenState } from '@moryflow/agents-runtime/ui-message/visibility-policy';
import { resolveToolOuterSummary } from '@moryflow/agents-runtime/ui-message/tool-command-summary';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';

type MessageToolProps = {
  part: ToolUIPart | DynamicToolUIPart;
  messageId: string;
  partIndex: number;
};

export function MessageTool({ part, messageId, partIndex }: MessageToolProps) {
  const toolType = part.type === 'dynamic-tool' ? `tool-${part.toolName}` : part.type;
  const hasOutput = part.output !== undefined || !!part.errorText;
  const toolState = part.state as ToolState;
  const toolSummary = resolveToolOuterSummary({
    type: toolType,
    state: toolState,
    input: (part.input as Record<string, unknown> | undefined) ?? undefined,
    output: part.output,
  });
  const [userOpenPreference, setUserOpenPreference] = useState<boolean | null>(null);
  const isOpen =
    userOpenPreference === false
      ? false
      : resolveToolOpenState({
          state: toolState,
          hasManualExpanded: userOpenPreference === true,
        });

  const handleOpenChange = (nextOpen: boolean) => {
    setUserOpenPreference(nextOpen);
  };

  return (
    <Tool open={isOpen} onOpenChange={handleOpenChange} disabled={!hasOutput}>
      <ToolSummary
        summary={toolSummary.outerSummary}
        viewportAnchorId={`tool:${messageId}:${partIndex}`}
      />
      {hasOutput ? (
        <ToolContent state={toolState}>
          <ToolHeader
            type={toolType}
            state={toolState}
            input={part.input as Record<string, unknown> | undefined}
            scriptType={toolSummary.scriptType}
            command={toolSummary.command}
          />
          <ToolOutput output={part.output} errorText={part.errorText} />
        </ToolContent>
      ) : null}
    </Tool>
  );
}
