/**
 * [PROPS]: MessageToolProps - ToolUIPart/DynamicToolUIPart 渲染参数
 * [EMITS]: None
 * [POS]: AgentMessageList 的 Tool 消息渲染
 * [UPDATE]: 2026-03-02 - Tool 状态迁移策略改为复用 @moryflow/agents-runtime 共享事实源
 * [UPDATE]: 2026-03-02 - 对齐 Moryflow Tool 交互：运行态默认展开、完成后自动折叠，移除 Parameters 输入区
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useEffect, useRef, useState } from 'react';
import { Tool, ToolContent, ToolHeader, ToolOutput, type ToolState } from '@moryflow/ui/ai/tool';
import {
  isToolInProgressState,
  shouldAutoCollapse,
} from '@moryflow/agents-runtime/ui-message/visibility-policy';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';

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
        className="px-0 py-0.5"
      />
      {hasOutput ? (
        <ToolContent className="pt-2">
          <ToolOutput output={part.output} errorText={part.errorText} />
        </ToolContent>
      ) : null}
    </Tool>
  );
}
