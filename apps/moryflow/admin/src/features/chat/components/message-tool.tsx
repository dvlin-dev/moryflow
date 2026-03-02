/**
 * [PROPS]: MessageToolProps - ToolUIPart 渲染参数
 * [EMITS]: None
 * [POS]: Admin chat Tool 片段渲染（与 PC/Console 同语义）
 */

import { useState } from 'react';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { Tool, ToolContent, ToolHeader, ToolOutput, type ToolState } from '@moryflow/ui/ai/tool';
import { resolveToolOpenState } from '@moryflow/agents-runtime/ui-message/visibility-policy';

type MessageToolProps = {
  part: ToolUIPart | DynamicToolUIPart;
};

export function MessageTool({ part }: MessageToolProps) {
  const toolType = part.type === 'dynamic-tool' ? `tool-${part.toolName}` : part.type;
  const toolState = part.state as ToolState;
  const hasOutput = part.output !== undefined || !!part.errorText;
  const [userOpenPreference, setUserOpenPreference] = useState<boolean | null>(null);
  const isOpen =
    userOpenPreference === false
      ? false
      : resolveToolOpenState({
          state: toolState,
          hasManualExpanded: userOpenPreference === true,
        });

  return (
    <Tool
      className="mb-3 w-full border-0 bg-transparent p-0"
      open={isOpen}
      onOpenChange={setUserOpenPreference}
      disabled={!hasOutput}
    >
      <ToolHeader type={toolType} state={toolState} input={part.input as Record<string, unknown>} />
      {hasOutput ? (
        <ToolContent className="pt-2">
          <ToolOutput output={part.output} errorText={part.errorText} />
        </ToolContent>
      ) : null}
    </Tool>
  );
}
